import { performance } from "node:perf_hooks";
import type { CDPSession, Page } from "@playwright/test";
import { PERF_PROCESS_CPU_SAMPLE_INTERVAL_MS } from "./perf-constants.js";

export interface PerfBrowserProcessInfo {
  type: string;
  id: number;
  cpuTime: number;
}

export interface PerfBrowserProcessSnapshot {
  capturedAtMs: number;
  processInfo: PerfBrowserProcessInfo[];
}

export interface PerfProcessCpuByType {
  cpuSeconds: number;
  corePercent: number;
}

export interface PerfProcessCpuByPid {
  pid: number;
  type: string;
  cpuSeconds: number;
}

export interface PerfProcessCpuSample {
  available: boolean;
  wallTimeMs: number;
  sampleCount: number;
  totalCpuSeconds: number;
  totalCorePercent: number;
  hostNormalizedPercent: number;
  harnessCorePercent: number;
  byType: Record<string, PerfProcessCpuByType>;
  byPid: PerfProcessCpuByPid[];
  error?: string;
}

export interface PerfProcessCpuMetrics {
  aggregate: PerfProcessCpuSample;
  perSample: PerfProcessCpuSample[];
}

export interface PerfProcessCpuProbe {
  stop(): Promise<PerfProcessCpuSample>;
}

interface SystemInfoProcessResponse {
  processInfo: PerfBrowserProcessInfo[];
}

interface MutableProcessCpuTotal {
  pid: number;
  type: string;
  cpuSeconds: number;
}

const roundTo3 = (value: number): number => Number(value.toFixed(3));

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const middleIndex = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
};

const unavailableSample = (error: string): PerfProcessCpuSample => ({
  available: false,
  wallTimeMs: 0,
  sampleCount: 0,
  totalCpuSeconds: 0,
  totalCorePercent: 0,
  hostNormalizedPercent: 0,
  harnessCorePercent: 0,
  byType: {},
  byPid: [],
  error,
});

const readProcessSnapshot = async (
  browserSession: CDPSession,
  startedAtMs: number,
): Promise<PerfBrowserProcessSnapshot> => {
  const response: SystemInfoProcessResponse = await browserSession.send(
    "SystemInfo.getProcessInfo",
  );
  return {
    capturedAtMs: performance.now() - startedAtMs,
    processInfo: response.processInfo,
  };
};

export const summarizeProcessCpuSnapshots = (
  snapshots: PerfBrowserProcessSnapshot[],
  wallTimeMs: number,
  logicalCpuCount: number,
  harnessCpuMicroseconds: number,
): PerfProcessCpuSample => {
  if (snapshots.length === 0) return unavailableSample("No process snapshots were captured");

  const initialPids = new Set(snapshots[0].processInfo.map((processInfo) => processInfo.id));
  const previousCpuTimeByPid = new Map<number, number>();
  const totalsByPid = new Map<number, MutableProcessCpuTotal>();

  for (let snapshotIndex = 0; snapshotIndex < snapshots.length; snapshotIndex++) {
    const snapshot = snapshots[snapshotIndex];
    for (const processInfo of snapshot.processInfo) {
      const previousCpuTime = previousCpuTimeByPid.get(processInfo.id);
      let cpuDelta = 0;
      if (previousCpuTime !== undefined) {
        cpuDelta =
          processInfo.cpuTime >= previousCpuTime
            ? processInfo.cpuTime - previousCpuTime
            : processInfo.cpuTime;
      } else if (snapshotIndex > 0 && !initialPids.has(processInfo.id)) {
        cpuDelta = processInfo.cpuTime;
      }
      previousCpuTimeByPid.set(processInfo.id, processInfo.cpuTime);
      if (cpuDelta <= 0) continue;
      const currentTotal = totalsByPid.get(processInfo.id);
      if (currentTotal) {
        currentTotal.cpuSeconds += cpuDelta;
        currentTotal.type = processInfo.type;
      } else {
        totalsByPid.set(processInfo.id, {
          pid: processInfo.id,
          type: processInfo.type,
          cpuSeconds: cpuDelta,
        });
      }
    }
  }

  const safeWallTimeSeconds = Math.max(wallTimeMs / 1000, Number.EPSILON);
  const byTypeSeconds = new Map<string, number>();
  let totalCpuSeconds = 0;
  for (const processTotal of totalsByPid.values()) {
    totalCpuSeconds += processTotal.cpuSeconds;
    byTypeSeconds.set(
      processTotal.type,
      (byTypeSeconds.get(processTotal.type) ?? 0) + processTotal.cpuSeconds,
    );
  }
  const byType: Record<string, PerfProcessCpuByType> = {};
  for (const [processType, cpuSeconds] of byTypeSeconds) {
    byType[processType] = {
      cpuSeconds: roundTo3(cpuSeconds),
      corePercent: roundTo3((cpuSeconds / safeWallTimeSeconds) * 100),
    };
  }
  const totalCorePercent = (totalCpuSeconds / safeWallTimeSeconds) * 100;
  return {
    available: true,
    wallTimeMs: roundTo3(wallTimeMs),
    sampleCount: snapshots.length,
    totalCpuSeconds: roundTo3(totalCpuSeconds),
    totalCorePercent: roundTo3(totalCorePercent),
    hostNormalizedPercent: roundTo3(totalCorePercent / Math.max(1, logicalCpuCount)),
    harnessCorePercent: roundTo3((harnessCpuMicroseconds / 1_000_000 / safeWallTimeSeconds) * 100),
    byType,
    byPid: [...totalsByPid.values()]
      .sort((leftProcess, rightProcess) => rightProcess.cpuSeconds - leftProcess.cpuSeconds)
      .map((processTotal) => ({
        ...processTotal,
        cpuSeconds: roundTo3(processTotal.cpuSeconds),
      })),
  };
};

export const aggregateProcessCpuSamples = (
  samples: PerfProcessCpuSample[],
): PerfProcessCpuMetrics => {
  const availableSamples = samples.filter((sample) => sample.available);
  if (availableSamples.length === 0) {
    return {
      aggregate: unavailableSample(samples[0]?.error ?? "Process CPU sampling unavailable"),
      perSample: samples,
    };
  }
  const processTypes = new Set(availableSamples.flatMap((sample) => Object.keys(sample.byType)));
  const byType: Record<string, PerfProcessCpuByType> = {};
  for (const processType of processTypes) {
    byType[processType] = {
      cpuSeconds: roundTo3(
        median(availableSamples.map((sample) => sample.byType[processType]?.cpuSeconds ?? 0)),
      ),
      corePercent: roundTo3(
        median(availableSamples.map((sample) => sample.byType[processType]?.corePercent ?? 0)),
      ),
    };
  }
  return {
    aggregate: {
      available: true,
      wallTimeMs: roundTo3(median(availableSamples.map((sample) => sample.wallTimeMs))),
      sampleCount: Math.round(median(availableSamples.map((sample) => sample.sampleCount))),
      totalCpuSeconds: roundTo3(median(availableSamples.map((sample) => sample.totalCpuSeconds))),
      totalCorePercent: roundTo3(median(availableSamples.map((sample) => sample.totalCorePercent))),
      hostNormalizedPercent: roundTo3(
        median(availableSamples.map((sample) => sample.hostNormalizedPercent)),
      ),
      harnessCorePercent: roundTo3(
        median(availableSamples.map((sample) => sample.harnessCorePercent)),
      ),
      byType,
      byPid: [],
    },
    perSample: samples,
  };
};

export const startProcessCpuProbe = async (
  page: Page,
  logicalCpuCount: number,
): Promise<PerfProcessCpuProbe> => {
  const browser = page.context().browser();
  if (!browser) {
    return { stop: async () => unavailableSample("Browser is disconnected") };
  }

  let browserSession: CDPSession;
  try {
    browserSession = await browser.newBrowserCDPSession();
  } catch (probeError) {
    const message = probeError instanceof Error ? probeError.message : String(probeError);
    return { stop: async () => unavailableSample(message) };
  }

  const startedAtMs = performance.now();
  const harnessCpuStart = process.cpuUsage();
  const snapshots: PerfBrowserProcessSnapshot[] = [];
  let pendingSample = Promise.resolve();
  let sampleError: string | undefined;

  const captureSample = async (): Promise<void> => {
    if (sampleError) return;
    try {
      snapshots.push(await readProcessSnapshot(browserSession, startedAtMs));
    } catch (captureError) {
      sampleError = captureError instanceof Error ? captureError.message : String(captureError);
    }
  };
  await captureSample();
  const intervalHandle = setInterval(() => {
    pendingSample = pendingSample.then(captureSample);
  }, PERF_PROCESS_CPU_SAMPLE_INTERVAL_MS);

  return {
    async stop() {
      clearInterval(intervalHandle);
      await pendingSample;
      await captureSample();
      const wallTimeMs = performance.now() - startedAtMs;
      const harnessCpu = process.cpuUsage(harnessCpuStart);
      try {
        await browserSession.detach();
      } catch {
        // Browser teardown can detach the session before the probe stops.
      }
      if (sampleError && snapshots.length === 0) return unavailableSample(sampleError);
      return summarizeProcessCpuSnapshots(
        snapshots,
        wallTimeMs,
        logicalCpuCount,
        harnessCpu.user + harnessCpu.system,
      );
    },
  };
};
