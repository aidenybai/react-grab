import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { platform } from "node:os";
import { performance } from "node:perf_hooks";
import type { CDPSession, Page } from "@playwright/test";
import type { PerfBrowserGpuInfo } from "./perf-environment.js";
import {
  PERF_HARDWARE_GPU_SAMPLE_INTERVAL_MS,
  PERF_HARDWARE_GPU_STOP_DEADLINE_MS,
  PERF_MICROSECONDS_PER_MILLISECOND,
  PERF_MILLISECONDS_PER_SECOND,
  PERF_MILLIWATTS_PER_WATT,
  PERF_NANOSECONDS_PER_MILLISECOND,
  PERF_P95_PERCENTILE,
  PERF_PERCENT_SCALE,
} from "./perf-constants.js";
import { mean, median, percentile, roundTo3 } from "./perf-statistics.js";

export interface PerfHardwareGpuProcessSample {
  pid: number;
  name: string;
  busyPercent: number;
  activeTimeMs: number;
}

export interface PerfHardwareGpuEngineSample {
  engine: string;
  busyPercent: number;
  activeTimeMs: number;
}

export interface PerfHardwareGpuSample {
  status: string;
  backend: string;
  sampleCount: number;
  systemBusyMeanPercent?: number;
  systemBusyP95Percent?: number;
  systemBusyMaxPercent?: number;
  browserBusyMeanPercent?: number;
  browserBusyMaxPercent?: number;
  browserActiveTimeMs?: number;
  gpuPowerMeanMw?: number;
  gpuPowerMaxMw?: number;
  processes: PerfHardwareGpuProcessSample[];
  engines: PerfHardwareGpuEngineSample[];
  warnings: string[];
  error?: string;
}

export interface PerfHardwareGpuMetrics {
  aggregate: PerfHardwareGpuSample;
  perSample: PerfHardwareGpuSample[];
}

export interface PerfHardwareGpuProbe {
  stop(): Promise<PerfHardwareGpuSample>;
}

interface BrowserProcessInfo {
  type: string;
  id: number;
  cpuTime: number;
}

interface BrowserProcessResponse {
  processInfo: BrowserProcessInfo[];
}

export interface DrmEngineSnapshot {
  capturedAtMs: number;
  activeNanosecondsByEngine: Map<string, number>;
}

interface MutableHardwareGpuProcess {
  pid: number;
  name: string;
  busyValues: number[];
  activeTimeMs: number;
}

export interface HardwareGpuChildProcessExit {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

const unavailableGpuSample = (
  status: string,
  backend: string,
  error?: string,
): PerfHardwareGpuSample => ({
  status,
  backend,
  sampleCount: 0,
  processes: [],
  engines: [],
  warnings: [],
  error,
});

const readBrowserProcessIds = async (page: Page): Promise<Set<number>> => {
  const browser = page.context().browser();
  if (!browser) return new Set();
  let browserSession: CDPSession | null = null;
  try {
    browserSession = await browser.newBrowserCDPSession();
    const response: BrowserProcessResponse = await browserSession.send("SystemInfo.getProcessInfo");
    return new Set(response.processInfo.map((processInfo) => processInfo.id));
  } finally {
    if (browserSession) await browserSession.detach();
  }
};

const parseDurationMilliseconds = (value: number, unit: string): number => {
  if (unit === "us") return value / PERF_MICROSECONDS_PER_MILLISECOND;
  if (unit === "s") return value * PERF_MILLISECONDS_PER_SECOND;
  return value;
};

export const parsePowermetricsOutput = (
  output: string,
  browserProcessIds: Set<number>,
): PerfHardwareGpuSample => {
  const systemBusyValues = [...output.matchAll(/GPU HW active residency:\s*([\d.]+)%/gi)].map(
    (match) => Number(match[1]),
  );
  const gpuPowerValues = [...output.matchAll(/GPU Power:\s*([\d.]+)\s*(mW|W)/gi)].map(
    (match) => Number(match[1]) * (match[2].toLowerCase() === "w" ? PERF_MILLIWATTS_PER_WATT : 1),
  );
  const processesByPid = new Map<number, MutableHardwareGpuProcess>();
  const processPattern = /^pid\s+(\d+)\s+(.+?)\s+([\d.]+)\s*(us|ms|s)(?:\s+\(([\d.]+)\s*%\))?/gim;
  for (const match of output.matchAll(processPattern)) {
    const pid = Number(match[1]);
    if (!browserProcessIds.has(pid)) continue;
    const activeTimeMs = parseDurationMilliseconds(Number(match[3]), match[4].toLowerCase());
    const busyPercent = match[5] ? Number(match[5]) : 0;
    const currentProcess = processesByPid.get(pid);
    if (currentProcess) {
      currentProcess.activeTimeMs += activeTimeMs;
      currentProcess.busyValues.push(busyPercent);
    } else {
      processesByPid.set(pid, {
        pid,
        name: match[2].trim(),
        activeTimeMs,
        busyValues: [busyPercent],
      });
    }
  }
  const processes = [...processesByPid.values()]
    .map((processSample) => ({
      pid: processSample.pid,
      name: processSample.name,
      busyPercent: roundTo3(mean(processSample.busyValues)),
      activeTimeMs: roundTo3(processSample.activeTimeMs),
    }))
    .sort((leftProcess, rightProcess) => rightProcess.activeTimeMs - leftProcess.activeTimeMs);
  const browserBusyMeanPercent = Math.min(
    PERF_PERCENT_SCALE,
    [...processesByPid.values()].reduce(
      (combinedBusyPercent, processSample) => combinedBusyPercent + mean(processSample.busyValues),
      0,
    ),
  );
  const browserBusyMaxPercent = Math.min(
    PERF_PERCENT_SCALE,
    [...processesByPid.values()].reduce(
      (combinedBusyPercent, processSample) =>
        combinedBusyPercent + Math.max(...processSample.busyValues),
      0,
    ),
  );
  return {
    status: systemBusyValues.length > 0 || processes.length > 0 ? "available" : "unavailable",
    backend: "macos-powermetrics",
    sampleCount: systemBusyValues.length,
    systemBusyMeanPercent:
      systemBusyValues.length > 0 ? roundTo3(mean(systemBusyValues)) : undefined,
    systemBusyP95Percent:
      systemBusyValues.length > 0
        ? roundTo3(percentile(systemBusyValues, PERF_P95_PERCENTILE))
        : undefined,
    systemBusyMaxPercent:
      systemBusyValues.length > 0 ? roundTo3(Math.max(...systemBusyValues)) : undefined,
    browserBusyMeanPercent: processes.length > 0 ? roundTo3(browserBusyMeanPercent) : undefined,
    browserBusyMaxPercent: processes.length > 0 ? roundTo3(browserBusyMaxPercent) : undefined,
    browserActiveTimeMs:
      processes.length > 0
        ? roundTo3(
            processes.reduce(
              (totalActiveTime, processSample) => totalActiveTime + processSample.activeTimeMs,
              0,
            ),
          )
        : undefined,
    gpuPowerMeanMw: gpuPowerValues.length > 0 ? roundTo3(mean(gpuPowerValues)) : undefined,
    gpuPowerMaxMw: gpuPowerValues.length > 0 ? roundTo3(Math.max(...gpuPowerValues)) : undefined,
    processes,
    engines: [],
    warnings:
      processes.length === 0
        ? ["powermetrics did not expose per-process GPU time for the Chromium PID set"]
        : [],
    error:
      systemBusyValues.length === 0 && processes.length === 0
        ? "powermetrics produced no supported GPU counters"
        : undefined,
  };
};

export const waitForHardwareGpuProcessExit = (
  childProcess: ChildProcessWithoutNullStreams,
): Promise<HardwareGpuChildProcessExit> => {
  const didProcessClose = (): boolean =>
    (childProcess.exitCode !== null || childProcess.signalCode !== null) &&
    childProcess.stdout.closed &&
    childProcess.stderr.closed;
  if (didProcessClose()) {
    return Promise.resolve({
      exitCode: childProcess.exitCode,
      signal: childProcess.signalCode,
    });
  }
  return new Promise((resolveExit) => {
    let deadlineHandle: ReturnType<typeof setTimeout> | undefined;
    let didFinish = false;
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      if (didFinish) return;
      didFinish = true;
      if (deadlineHandle) clearTimeout(deadlineHandle);
      childProcess.removeListener("close", finish);
      resolveExit({ exitCode, signal });
    };
    childProcess.once("close", finish);
    deadlineHandle = setTimeout(() => {
      childProcess.kill("SIGKILL");
      const signal = childProcess.signalCode ?? (childProcess.exitCode === null ? "SIGKILL" : null);
      finish(childProcess.exitCode, signal);
    }, PERF_HARDWARE_GPU_STOP_DEADLINE_MS);
    if (didProcessClose()) {
      finish(childProcess.exitCode, childProcess.signalCode);
    }
  });
};

const startMacosGpuProbe = async (page: Page): Promise<PerfHardwareGpuProbe> => {
  if (process.env.PERF_GPU !== "1") {
    return {
      stop: async () =>
        unavailableGpuSample(
          "permission-required",
          "macos-powermetrics",
          "Set PERF_GPU=1 after pre-authorizing sudo; the harness always uses sudo -n and never prompts",
        ),
    };
  }
  const browserProcessIds = await readBrowserProcessIds(page);
  const childProcess = spawn(
    "/usr/bin/sudo",
    [
      "-n",
      "/usr/bin/powermetrics",
      "--samplers",
      "tasks,gpu_power",
      "--show-process-gpu",
      "--show-process-samp-norm",
      "--handle-invalid-values",
      "--buffer-size",
      "1",
      "--format",
      "text",
      "--sample-rate",
      String(PERF_HARDWARE_GPU_SAMPLE_INTERVAL_MS),
      "--sample-count",
      "-1",
    ],
    { stdio: "pipe" },
  );
  let standardOutput = "";
  let standardError = "";
  childProcess.stdout.setEncoding("utf8");
  childProcess.stderr.setEncoding("utf8");
  childProcess.stdout.on("data", (chunk: string) => {
    standardOutput += chunk;
  });
  childProcess.stderr.on("data", (chunk: string) => {
    standardError += chunk;
  });
  return {
    async stop() {
      childProcess.kill("SIGINT");
      const exit = await waitForHardwareGpuProcessExit(childProcess);
      if (
        /password is required|not permitted|must be invoked as the superuser/i.test(standardError)
      ) {
        return unavailableGpuSample(
          "permission-denied",
          "macos-powermetrics",
          standardError.trim(),
        );
      }
      if (standardOutput.length === 0) {
        return unavailableGpuSample(
          "unavailable",
          "macos-powermetrics",
          standardError.trim() || `powermetrics exited with ${String(exit.exitCode)}`,
        );
      }
      return parsePowermetricsOutput(standardOutput, browserProcessIds);
    },
  };
};

const readDrmEngineSnapshot = async (
  page: Page,
  startedAtMs: number,
): Promise<DrmEngineSnapshot> => {
  const browserProcessIds = await readBrowserProcessIds(page);
  const activeNanosecondsByEngine = new Map<string, number>();
  const seenClients = new Set<string>();
  for (const pid of browserProcessIds) {
    let fileNames: string[];
    try {
      fileNames = await readdir(`/proc/${pid}/fdinfo`);
    } catch {
      continue;
    }
    for (const fileName of fileNames) {
      let fileText: string;
      try {
        fileText = await readFile(`/proc/${pid}/fdinfo/${fileName}`, "utf8");
      } catch {
        continue;
      }
      const clientId = /^drm-client-id:\s*(\d+)/m.exec(fileText)?.[1];
      const deviceId = /^drm-pdev:\s*(.+)$/m.exec(fileText)?.[1]?.trim() ?? "default";
      const clientKey = `${deviceId}:${clientId}`;
      if (!clientId || seenClients.has(clientKey)) continue;
      seenClients.add(clientKey);
      for (const match of fileText.matchAll(/^drm-engine-(.+?):\s*(\d+)\s*ns/gm)) {
        const engine = match[1];
        activeNanosecondsByEngine.set(
          engine,
          (activeNanosecondsByEngine.get(engine) ?? 0) + Number(match[2]),
        );
      }
    }
  }
  return { capturedAtMs: performance.now() - startedAtMs, activeNanosecondsByEngine };
};

export const summarizeDrmEngineSnapshots = (
  initialSnapshot: DrmEngineSnapshot,
  finalSnapshot: DrmEngineSnapshot,
): PerfHardwareGpuSample => {
  const wallTimeMs = Math.max(finalSnapshot.capturedAtMs - initialSnapshot.capturedAtMs, 0);
  const engines: PerfHardwareGpuEngineSample[] = [];
  for (const [engine, finalActiveNanoseconds] of finalSnapshot.activeNanosecondsByEngine) {
    const initialActiveNanoseconds = initialSnapshot.activeNanosecondsByEngine.get(engine) ?? 0;
    const activeNanoseconds = Math.max(finalActiveNanoseconds - initialActiveNanoseconds, 0);
    const activeTimeMs = activeNanoseconds / PERF_NANOSECONDS_PER_MILLISECOND;
    engines.push({
      engine,
      activeTimeMs: roundTo3(activeTimeMs),
      busyPercent: roundTo3(
        (activeTimeMs / Math.max(wallTimeMs, Number.EPSILON)) * PERF_PERCENT_SCALE,
      ),
    });
  }
  engines.sort((leftEngine, rightEngine) => rightEngine.busyPercent - leftEngine.busyPercent);
  return {
    status: engines.length > 0 ? "available" : "unsupported",
    backend: "linux-drm-fdinfo",
    sampleCount: engines.length > 0 ? 2 : 0,
    browserBusyMeanPercent:
      engines.length > 0 ? roundTo3(mean(engines.map((engine) => engine.busyPercent))) : undefined,
    browserBusyMaxPercent:
      engines.length > 0
        ? roundTo3(Math.max(...engines.map((engine) => engine.busyPercent)))
        : undefined,
    browserActiveTimeMs:
      engines.length > 0
        ? roundTo3(
            engines.reduce((totalActiveTime, engine) => totalActiveTime + engine.activeTimeMs, 0),
          )
        : undefined,
    processes: [],
    engines,
    warnings: [],
    error:
      engines.length > 0 ? undefined : "No DRM engine counters were exposed in Chromium fdinfo",
  };
};

const startLinuxGpuProbe = async (page: Page): Promise<PerfHardwareGpuProbe> => {
  const startedAtMs = performance.now();
  const initialSnapshot = await readDrmEngineSnapshot(page, startedAtMs);
  return {
    async stop() {
      const finalSnapshot = await readDrmEngineSnapshot(page, startedAtMs);
      return summarizeDrmEngineSnapshots(initialSnapshot, finalSnapshot);
    },
  };
};

export const startHardwareGpuProbe = async (
  page: Page,
  browserGpuInfo: PerfBrowserGpuInfo,
): Promise<PerfHardwareGpuProbe> => {
  const isSoftwareRendering = [
    browserGpuInfo.featureStatus.gpu_compositing,
    browserGpuInfo.featureStatus.rasterization,
  ].some((featureStatus) => featureStatus?.includes("software"));
  if (isSoftwareRendering) {
    return {
      stop: async () =>
        unavailableGpuSample(
          "software-rendering",
          "browser-feature-status",
          "Chromium reports software compositing or rasterization",
        ),
    };
  }
  const hostPlatform = platform();
  if (hostPlatform === "darwin") return startMacosGpuProbe(page);
  if (hostPlatform === "linux") return startLinuxGpuProbe(page);
  return {
    stop: async () =>
      unavailableGpuSample(
        "unsupported",
        "none",
        `No hardware GPU adapter is implemented for ${hostPlatform}`,
      ),
  };
};

export const aggregateHardwareGpuSamples = (
  samples: PerfHardwareGpuSample[],
): PerfHardwareGpuMetrics => {
  const availableSamples = samples.filter((sample) => sample.status === "available");
  if (availableSamples.length === 0) {
    return {
      aggregate:
        samples[0] ?? unavailableGpuSample("unavailable", "none", "No GPU samples captured"),
      perSample: samples,
    };
  }
  const numericMedian = (getValue: (sample: PerfHardwareGpuSample) => number | undefined) => {
    const values = availableSamples
      .map(getValue)
      .filter((value): value is number => value !== undefined);
    return values.length > 0 ? roundTo3(median(values)) : undefined;
  };
  return {
    aggregate: {
      status: "available",
      backend: availableSamples[0].backend,
      sampleCount: Math.round(mean(availableSamples.map((sample) => sample.sampleCount))),
      systemBusyMeanPercent: numericMedian((sample) => sample.systemBusyMeanPercent),
      systemBusyP95Percent: numericMedian((sample) => sample.systemBusyP95Percent),
      systemBusyMaxPercent: numericMedian((sample) => sample.systemBusyMaxPercent),
      browserBusyMeanPercent: numericMedian((sample) => sample.browserBusyMeanPercent),
      browserBusyMaxPercent: numericMedian((sample) => sample.browserBusyMaxPercent),
      browserActiveTimeMs: numericMedian((sample) => sample.browserActiveTimeMs),
      gpuPowerMeanMw: numericMedian((sample) => sample.gpuPowerMeanMw),
      gpuPowerMaxMw: numericMedian((sample) => sample.gpuPowerMaxMw),
      processes: [],
      engines: [],
      warnings: [...new Set(availableSamples.flatMap((sample) => sample.warnings))],
    },
    perSample: samples,
  };
};
