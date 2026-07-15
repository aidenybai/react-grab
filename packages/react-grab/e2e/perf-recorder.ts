import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CDPSession, Page, TestInfo } from "@playwright/test";
import {
  captureAnimationCounterfactual,
  pauseRunningAnimations,
  resumePausedAnimations,
  type PerfAnimationCounterfactualReport,
} from "./perf-animation-counterfactual.js";
import { PERF_MUTATION_TARGET_LIMIT, PERF_REPORT_SCHEMA_VERSION } from "./perf-constants.js";
import {
  captureDomMutationAttribution,
  type PerfDomMutationAttributionReport,
} from "./perf-dom-mutation-attribution.js";
import { capturePerfEnvironment, type PerfEnvironment } from "./perf-environment.js";
import {
  aggregateHardwareGpuSamples,
  startHardwareGpuProbe,
  type PerfHardwareGpuMetrics,
  type PerfHardwareGpuSample,
} from "./perf-hardware-gpu.js";
import {
  aggregateProcessCpuSamples,
  startProcessCpuProbe,
  type PerfProcessCpuMetrics,
  type PerfProcessCpuSample,
} from "./perf-process-cpu.js";
import { captureRenderTrace, type PerfRenderTraceReport } from "./perf-render-trace.js";
import {
  aggregatePerfRunValidity,
  assertValidHeadedPerfRun,
  startPerfRunValidityProbe,
  type PerfRunValidityMetrics,
  type PerfRunValiditySummary,
} from "./perf-validity.js";
import { capturePerfWorkload, type PerfWorkloadSnapshot } from "./perf-workload.js";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_PERF_DIR = resolve(E2E_DIR, "../perf");

declare global {
  interface Window {
    __PERF_BENCH__?: {
      start(mutationTargetLimit: number): void;
      stop(): PerfRawSnapshot;
    };
  }
}

export interface PerfMutationTarget {
  target: string;
  count: number;
}

export interface PerfCssActivity {
  attributeChanges: number;
  classChanges: number;
  inlineStyleChanges: number;
  childListChanges: number;
  addedNodes: number;
  removedNodes: number;
  animationStarts: number;
  animationIterations: number;
  animationEnds: number;
  animationCancels: number;
  transitionRuns: number;
  transitionStarts: number;
  transitionEnds: number;
  transitionCancels: number;
  activeAnimationsAtStart: number;
  activeAnimationsAtEnd: number;
  topMutationTargets: PerfMutationTarget[];
}

export interface PerfRawSnapshot {
  frameDeltas: number[];
  longTasks: number[];
  longAnimationFrames: Array<{ duration: number; blockingDuration: number }>;
  inp: number;
  interactionCount: number;
  cssActivity: PerfCssActivity;
}

export interface PerfStatsSummary {
  count: number;
  mean: number;
  stddev: number;
  median: number;
  p95: number;
  max: number;
}

export interface PerfFpsSummary {
  mean: number;
  p5Low: number;
  droppedFrames: number;
  droppedFramePercent: number;
  refreshIntervalMs: number;
  refreshRateHz: number;
}

export interface PerfScenarioAggregate {
  inp: number;
  interactions: number;
  longTasks: { count: number; sum: number; max: number };
  longAnimationFrames: { count: number; sum: number; max: number; maxBlocking: number };
  frames: PerfStatsSummary;
  fps: PerfFpsSummary;
  cssActivity: PerfCssActivity;
}

export interface PerfMemorySnapshot {
  jsHeapUsedKb: number;
  jsHeapTotalKb: number;
  domNodes: number;
  jsEventListeners: number;
  documents: number;
}

export interface PerfMemoryMetrics {
  before: PerfMemorySnapshot;
  after: PerfMemorySnapshot;
  delta: PerfMemorySnapshot;
}

export interface PerfScenarioMetadata {
  [key: string]: string | number | boolean | null;
}

export interface PerfWorkloadMetrics {
  before: PerfWorkloadSnapshot;
  after: PerfWorkloadSnapshot;
  metadata?: PerfScenarioMetadata;
}

export interface PerfReportInputs {
  environment: PerfEnvironment;
  workload: PerfWorkloadMetrics;
  processCpu: PerfProcessCpuMetrics;
  hardwareGpu: PerfHardwareGpuMetrics;
  renderTrace?: PerfRenderTraceReport;
  validity: PerfRunValidityMetrics;
  animationCounterfactual?: PerfAnimationCounterfactualReport;
  domMutationAttribution?: PerfDomMutationAttributionReport;
  warmupSamples: number;
}

// Installed lazily on the first `startRecording` call (via page.evaluate)
// so non-perf e2e tests pay zero JS-injection cost. PerformanceObserver
// is the live aggregate-only path; the V8 profiler and render trace are
// isolated replay passes with function- and pipeline-level attribution.
const installPerfRecorderScript = (): void => {
  if (window.__PERF_BENCH__) return;
  let isRecording = false;
  let frameDeltas: number[] = [];
  let longTasks: number[] = [];
  let longAnimationFrames: Array<{ duration: number; blockingDuration: number }> = [];
  let inpInteractionMap = new Map<number, number>();
  let observer: PerformanceObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let rafHandle = 0;
  let previousFrameTimestamp: number | null = null;
  let cssActivity: PerfCssActivity;
  let mutationTargetCounts = new Map<string, number>();
  let currentMutationTargetLimit = 0;

  const emptyCssActivity = (): PerfCssActivity => ({
    attributeChanges: 0,
    classChanges: 0,
    inlineStyleChanges: 0,
    childListChanges: 0,
    addedNodes: 0,
    removedNodes: 0,
    animationStarts: 0,
    animationIterations: 0,
    animationEnds: 0,
    animationCancels: 0,
    transitionRuns: 0,
    transitionStarts: 0,
    transitionEnds: 0,
    transitionCancels: 0,
    activeAnimationsAtStart: 0,
    activeAnimationsAtEnd: 0,
    topMutationTargets: [],
  });
  cssActivity = emptyCssActivity();

  const describeMutationTarget = (target: Node): string => {
    if (!(target instanceof Element)) return target.nodeName.toLowerCase();
    const identifier = target.id ? `#${CSS.escape(target.id)}` : "";
    const classNames = [...target.classList]
      .slice(0, 3)
      .map((className) => `.${CSS.escape(className)}`)
      .join("");
    return `${target.tagName.toLowerCase()}${identifier}${classNames}`;
  };

  const handleAnimationLifecycle = (event: Event): void => {
    switch (event.type) {
      case "animationstart":
        cssActivity.animationStarts += 1;
        break;
      case "animationiteration":
        cssActivity.animationIterations += 1;
        break;
      case "animationend":
        cssActivity.animationEnds += 1;
        break;
      case "animationcancel":
        cssActivity.animationCancels += 1;
        break;
      case "transitionrun":
        cssActivity.transitionRuns += 1;
        break;
      case "transitionstart":
        cssActivity.transitionStarts += 1;
        break;
      case "transitionend":
        cssActivity.transitionEnds += 1;
        break;
      case "transitioncancel":
        cssActivity.transitionCancels += 1;
        break;
    }
  };

  const animationLifecycleEventNames = [
    "animationstart",
    "animationiteration",
    "animationend",
    "animationcancel",
    "transitionrun",
    "transitionstart",
    "transitionend",
    "transitioncancel",
  ];

  const ingestMutationRecords = (mutationRecords: MutationRecord[]): void => {
    for (const mutationRecord of mutationRecords) {
      const targetDescription = describeMutationTarget(mutationRecord.target);
      mutationTargetCounts.set(
        targetDescription,
        (mutationTargetCounts.get(targetDescription) ?? 0) + 1,
      );
      if (mutationRecord.type === "attributes") {
        cssActivity.attributeChanges += 1;
        if (mutationRecord.attributeName === "class") cssActivity.classChanges += 1;
        if (mutationRecord.attributeName === "style") cssActivity.inlineStyleChanges += 1;
      } else if (mutationRecord.type === "childList") {
        cssActivity.childListChanges += 1;
        cssActivity.addedNodes += mutationRecord.addedNodes.length;
        cssActivity.removedNodes += mutationRecord.removedNodes.length;
      }
    }
  };

  const ingest = (entries: PerformanceEntryList): void => {
    for (const entry of entries) {
      if (entry.entryType === "event" || entry.entryType === "first-input") {
        const interactionId = (entry as PerformanceEventTiming).interactionId ?? 0;
        if (interactionId > 0) {
          const previousDuration = inpInteractionMap.get(interactionId);
          if (previousDuration === undefined || entry.duration > previousDuration) {
            inpInteractionMap.set(interactionId, entry.duration);
          }
        }
      } else if (entry.entryType === "longtask") {
        longTasks.push(entry.duration);
      } else if (entry.entryType === "long-animation-frame") {
        const loafEntry = entry as PerformanceEntry & { blockingDuration?: number };
        longAnimationFrames.push({
          duration: entry.duration,
          blockingDuration: loafEntry.blockingDuration ?? 0,
        });
      }
    }
  };

  window.__PERF_BENCH__ = {
    start(mutationTargetLimit) {
      isRecording = true;
      frameDeltas = [];
      longTasks = [];
      longAnimationFrames = [];
      inpInteractionMap = new Map();
      previousFrameTimestamp = null;
      cssActivity = emptyCssActivity();
      cssActivity.activeAnimationsAtStart = document.getAnimations().length;
      mutationTargetCounts = new Map();
      currentMutationTargetLimit = mutationTargetLimit;

      mutationObserver = new MutationObserver(ingestMutationRecords);
      mutationObserver.observe(document, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      for (const eventName of animationLifecycleEventNames) {
        document.addEventListener(eventName, handleAnimationLifecycle, true);
      }

      observer = new PerformanceObserver((list) => ingest(list.getEntries()));
      // `durationThreshold` is a Chromium extension not in lib.dom.d.ts yet;
      // 16ms keeps the noise floor low while catching every frame-dropping event.
      const observerOptionsList: PerformanceObserverInit[] = [
        { type: "event", buffered: false, durationThreshold: 16 } as PerformanceObserverInit & {
          durationThreshold: number;
        },
        { type: "longtask", buffered: false },
        { type: "long-animation-frame", buffered: false },
      ];
      for (const observerOptions of observerOptionsList) {
        try {
          observer.observe(observerOptions);
        } catch {
          // older Chromium lacks long-animation-frame, etc.
        }
      }

      const rafTick = (timestamp: number): void => {
        if (!isRecording) return;
        if (previousFrameTimestamp !== null) {
          frameDeltas.push(timestamp - previousFrameTimestamp);
        }
        previousFrameTimestamp = timestamp;
        rafHandle = requestAnimationFrame(rafTick);
      };
      rafHandle = requestAnimationFrame(rafTick);
    },
    stop() {
      isRecording = false;
      if (observer) {
        try {
          observer.disconnect();
        } catch {
          // ignore
        }
      }
      observer = null;
      if (mutationObserver) ingestMutationRecords(mutationObserver.takeRecords());
      mutationObserver?.disconnect();
      mutationObserver = null;
      for (const eventName of animationLifecycleEventNames) {
        document.removeEventListener(eventName, handleAnimationLifecycle, true);
      }
      if (rafHandle) cancelAnimationFrame(rafHandle);
      rafHandle = 0;
      cssActivity.activeAnimationsAtEnd = document.getAnimations().length;
      cssActivity.topMutationTargets = [...mutationTargetCounts.entries()]
        .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
        .slice(0, currentMutationTargetLimit)
        .map(([target, count]) => ({ target, count }));

      const interactionDurations = [...inpInteractionMap.values()].sort((a, b) => b - a);
      const interactionCount = interactionDurations.length;
      // INP per web-vitals convention: 98th-percentile worst interaction.
      const inp =
        interactionCount === 0
          ? 0
          : (interactionDurations[Math.floor(interactionCount * 0.02)] ?? 0);

      return {
        frameDeltas: frameDeltas.slice(),
        longTasks: longTasks.slice(),
        longAnimationFrames: longAnimationFrames.slice(),
        inp,
        interactionCount,
        cssActivity,
      };
    },
  };
};

const summarize = (values: number[]): PerfStatsSummary => {
  if (values.length === 0) {
    return { count: 0, mean: 0, stddev: 0, median: 0, p95: 0, max: 0 };
  }
  const sortedValues = [...values].sort((a, b) => a - b);
  const sumOfValues = sortedValues.reduce((accum, value) => accum + value, 0);
  const meanValue = sumOfValues / sortedValues.length;
  const variance =
    sortedValues.reduce((accum, value) => accum + (value - meanValue) ** 2, 0) /
    sortedValues.length;
  const pickPercentile = (percentile: number): number =>
    sortedValues[Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * percentile))];
  return {
    count: sortedValues.length,
    mean: Number(meanValue.toFixed(3)),
    stddev: Number(Math.sqrt(variance).toFixed(3)),
    median: Number(pickPercentile(0.5).toFixed(3)),
    p95: Number(pickPercentile(0.95).toFixed(3)),
    max: Number(sortedValues[sortedValues.length - 1].toFixed(3)),
  };
};

const roundTo3 = (value: number): number => Number(value.toFixed(3));

const summarizeFps = (frameDeltas: number[], refreshIntervalMs: number): PerfFpsSummary => {
  if (frameDeltas.length === 0) {
    return {
      mean: 0,
      p5Low: 0,
      droppedFrames: 0,
      droppedFramePercent: 0,
      refreshIntervalMs,
      refreshRateHz: roundTo3(1000 / refreshIntervalMs),
    };
  }
  const sortedDeltas = [...frameDeltas].sort((a, b) => a - b);
  const totalMs = sortedDeltas.reduce((accum, delta) => accum + delta, 0);
  const p95Delta =
    sortedDeltas[Math.min(sortedDeltas.length - 1, Math.floor(sortedDeltas.length * 0.95))];
  const droppedFrames = sortedDeltas.reduce(
    (missedFrameCount, frameDelta) =>
      missedFrameCount + Math.max(0, Math.round(frameDelta / refreshIntervalMs) - 1),
    0,
  );
  const expectedFrameCount = frameDeltas.length + droppedFrames;
  return {
    mean: roundTo3(totalMs === 0 ? 0 : (frameDeltas.length / totalMs) * 1000),
    p5Low: roundTo3(p95Delta === 0 ? 0 : 1000 / p95Delta),
    droppedFrames,
    droppedFramePercent: roundTo3((droppedFrames / expectedFrameCount) * 100),
    refreshIntervalMs: roundTo3(refreshIntervalMs),
    refreshRateHz: roundTo3(1000 / refreshIntervalMs),
  };
};
const sumRounded = (values: number[]): number =>
  roundTo3(values.reduce((accum, value) => accum + value, 0));
const maxRounded = (values: number[]): number =>
  values.length === 0 ? 0 : roundTo3(Math.max(...values));

const aggregateRawSnapshot = (
  rawSnapshot: PerfRawSnapshot,
  refreshIntervalMs: number,
): PerfScenarioAggregate => {
  const loafDurations = rawSnapshot.longAnimationFrames.map((frame) => frame.duration);
  const loafBlocking = rawSnapshot.longAnimationFrames.map((frame) => frame.blockingDuration);

  return {
    inp: roundTo3(rawSnapshot.inp),
    interactions: rawSnapshot.interactionCount,
    longTasks: {
      count: rawSnapshot.longTasks.length,
      sum: sumRounded(rawSnapshot.longTasks),
      max: maxRounded(rawSnapshot.longTasks),
    },
    longAnimationFrames: {
      count: rawSnapshot.longAnimationFrames.length,
      sum: sumRounded(loafDurations),
      max: maxRounded(loafDurations),
      maxBlocking: maxRounded(loafBlocking),
    },
    frames: summarize(rawSnapshot.frameDeltas),
    fps: summarizeFps(rawSnapshot.frameDeltas, refreshIntervalMs),
    cssActivity: rawSnapshot.cssActivity,
  };
};

const startRecording = async (page: Page): Promise<void> => {
  await page.evaluate(installPerfRecorderScript);
  await page.evaluate(
    (mutationTargetLimit) => window.__PERF_BENCH__!.start(mutationTargetLimit),
    PERF_MUTATION_TARGET_LIMIT,
  );
};

const stopRecording = (page: Page): Promise<PerfRawSnapshot> =>
  page.evaluate(() => {
    if (!window.__PERF_BENCH__) throw new Error("perf recorder not installed");
    return window.__PERF_BENCH__.stop();
  });

// --- Optional CPU profile capture (PERF_TRACE=1) ------------------------
//
// Captures a V8 sampling CPU profile for the scenario window via the CDP
// `Profiler` domain and writes it to perf/<label>/<scenario>.cpuprofile.
// Load it in Chrome DevTools ("Performance" panel > load profile) for a
// flame chart, or run `node scripts/analyze-perf-trace.mjs perf/<label>` for
// a self-time hotspot table. Pair with `pnpm build:profiling` so symbols are
// unminified.
//
// Deliberately uses the Profiler domain, NOT Tracing with the
// disabled-by-default-v8.cpu_profiler category: starting the profiler through
// the Tracing domain wedges the renderer main thread for minutes inside
// react-dom's click dispatch in headless Chromium (reproducible via the
// copy-then-deactivate-stress scenario), while the Profiler domain is far
// less intrusive.
//
// Even the Profiler domain can sporadically wedge the headless renderer:
// with the sampler active, a copy click can spin the main thread at 100%
// CPU in native code ("(program)" samples) for seconds to minutes,
// regardless of sampling interval or headless mode. The profiled pass is
// therefore run AFTER (and separately from) the metric samples, is bounded
// by a hard deadline, and never fails the test — a wedged capture only
// costs that scenario's .cpuprofile.

// V8's default sampling interval. Lowering it (e.g. to 100us) makes the
// renderer stall described above dramatically more likely and longer.
const CPU_PROFILE_SAMPLING_INTERVAL_US = 1000;
const CPU_PROFILE_CAPTURE_DEADLINE_MS = 60_000;
const CPU_PROFILE_STOP_DEADLINE_MS = 10_000;

const detachQuietly = async (cdpSession: CDPSession): Promise<void> => {
  try {
    await cdpSession.detach();
  } catch {
    // ignore
  }
};

const startCpuProfiler = async (page: Page): Promise<CDPSession> => {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("Profiler.enable");
  await cdpSession.send("Profiler.setSamplingInterval", {
    interval: CPU_PROFILE_SAMPLING_INTERVAL_US,
  });
  await cdpSession.send("Profiler.start");
  return cdpSession;
};

const stopCpuProfilerAndWrite = async (
  testInfo: TestInfo,
  scenarioName: string,
  cdpSession: CDPSession,
): Promise<void> => {
  let profileJson: string | null = null;
  try {
    const { profile } = await cdpSession.send("Profiler.stop");
    profileJson = JSON.stringify(profile);
  } finally {
    await detachQuietly(cdpSession);
  }
  if (!profileJson) return;

  const runLabel = process.env.PERF_LABEL ?? "current";
  await testInfo.attach(`perf-${scenarioName}.cpuprofile`, {
    body: profileJson,
    contentType: "application/json",
  });
  const labelDirPath = resolve(PACKAGE_PERF_DIR, runLabel);
  await mkdir(labelDirPath, { recursive: true });
  await writeFile(resolve(labelDirPath, `${scenarioName}.cpuprofile`), profileJson);
};

// --- Memory tracking (always on) ----------------------------------------
//
// Reads renderer memory counters via the CDP `Performance` domain around the
// metric samples, with forced GC (`HeapProfiler.collectGarbage`) before each
// reading so the before/after delta approximates *retained* growth (leaked
// nodes, listeners, detached documents) rather than transient garbage.
//
// A single collectGarbage pass is not enough for a stable reading: it can
// leave FinalizationRegistry / weak-callback garbage that only the *next*
// pass collects, and detached-node accounting lags a frame. So each reading
// loops GC → settle (double rAF + timeout, letting pending mounts/unmounts
// and finalizers run) → read, until the heap and node counts stop moving
// between passes (or a pass cap, for pages that allocate continuously).

const GC_STABILIZATION_MAX_PASSES = 6;
const GC_STABLE_HEAP_EPSILON_KB = 64;
const GC_SETTLE_DELAY_MS = 50;

const startMemoryProbe = async (page: Page): Promise<CDPSession> => {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("Performance.enable");
  await cdpSession.send("HeapProfiler.enable");
  return cdpSession;
};

const readRawMemoryMetrics = async (cdpSession: CDPSession): Promise<PerfMemorySnapshot> => {
  const { metrics } = await cdpSession.send("Performance.getMetrics");
  const metricValuesByName = new Map<string, number>();
  for (const metric of metrics) metricValuesByName.set(metric.name, metric.value);
  const metricValue = (metricName: string): number => metricValuesByName.get(metricName) ?? 0;
  return {
    jsHeapUsedKb: Math.round(metricValue("JSHeapUsedSize") / 1024),
    jsHeapTotalKb: Math.round(metricValue("JSHeapTotalSize") / 1024),
    domNodes: metricValue("Nodes"),
    jsEventListeners: metricValue("JSEventListeners"),
    documents: metricValue("Documents"),
  };
};

const readMemorySnapshot = async (
  cdpSession: CDPSession,
  page: Page,
): Promise<PerfMemorySnapshot> => {
  let previousReading: PerfMemorySnapshot | null = null;
  for (let passIndex = 0; passIndex < GC_STABILIZATION_MAX_PASSES; passIndex++) {
    await cdpSession.send("HeapProfiler.collectGarbage");
    await page.evaluate(
      (settleDelayMs) =>
        new Promise<void>((resolveSettle) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(resolveSettle, settleDelayMs);
            });
          });
        }),
      GC_SETTLE_DELAY_MS,
    );
    const currentReading = await readRawMemoryMetrics(cdpSession);
    const isStable =
      previousReading !== null &&
      Math.abs(currentReading.jsHeapUsedKb - previousReading.jsHeapUsedKb) <
        GC_STABLE_HEAP_EPSILON_KB &&
      currentReading.domNodes === previousReading.domNodes;
    if (isStable) return currentReading;
    previousReading = currentReading;
  }
  if (!previousReading) throw new Error("memory snapshot produced no reading");
  return previousReading;
};

const diffMemorySnapshots = (
  before: PerfMemorySnapshot,
  after: PerfMemorySnapshot,
): PerfMemorySnapshot => ({
  jsHeapUsedKb: after.jsHeapUsedKb - before.jsHeapUsedKb,
  jsHeapTotalKb: after.jsHeapTotalKb - before.jsHeapTotalKb,
  domNodes: after.domNodes - before.domNodes,
  jsEventListeners: after.jsEventListeners - before.jsEventListeners,
  documents: after.documents - before.documents,
});

const medianOfValues = (values: number[]): number => {
  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const middleIndex = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 1
    ? sortedValues[middleIndex]
    : Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
};

// Component-wise median across per-sample deltas. A single before/after
// window is hostage to whatever one-off retention (app caches, JIT code,
// GC-timing residue) happened to land inside it; the median of per-sample
// deltas rejects those spikes and reports steady-state per-iteration growth.
const medianMemoryDelta = (deltas: PerfMemorySnapshot[]): PerfMemorySnapshot => ({
  jsHeapUsedKb: medianOfValues(deltas.map((delta) => delta.jsHeapUsedKb)),
  jsHeapTotalKb: medianOfValues(deltas.map((delta) => delta.jsHeapTotalKb)),
  domNodes: medianOfValues(deltas.map((delta) => delta.domNodes)),
  jsEventListeners: medianOfValues(deltas.map((delta) => delta.jsEventListeners)),
  documents: medianOfValues(deltas.map((delta) => delta.documents)),
});

const raceDeadline = <ResultType>(
  work: Promise<ResultType>,
  deadlineMs: number,
): Promise<ResultType | "deadline"> =>
  Promise.race([
    work,
    new Promise<"deadline">((resolveDeadline) => {
      setTimeout(() => resolveDeadline("deadline"), deadlineMs);
    }),
  ]);

const captureScenarioCpuProfile = async (
  page: Page,
  testInfo: TestInfo,
  scenarioName: string,
  scenarioBody: () => Promise<void>,
): Promise<void> => {
  let profilerSession: CDPSession | null = null;
  try {
    profilerSession = await startCpuProfiler(page);
    const bodyPromise = scenarioBody().then(() => "done" as const);
    bodyPromise.catch(() => {});
    const bodyOutcome = await raceDeadline(bodyPromise, CPU_PROFILE_CAPTURE_DEADLINE_MS);
    if (bodyOutcome === "deadline") {
      console.warn(
        `[perf] ${scenarioName}: profiled pass exceeded ${CPU_PROFILE_CAPTURE_DEADLINE_MS}ms ` +
          `(known headless renderer stall under the V8 sampler); skipping .cpuprofile`,
      );
      await detachQuietly(profilerSession);
      return;
    }
    const stopOutcome = await raceDeadline(
      stopCpuProfilerAndWrite(testInfo, scenarioName, profilerSession).then(() => "done" as const),
      CPU_PROFILE_STOP_DEADLINE_MS,
    );
    if (stopOutcome === "deadline") {
      console.warn(`[perf] ${scenarioName}: Profiler.stop timed out; skipping .cpuprofile`);
      await detachQuietly(profilerSession);
    }
  } catch (captureError) {
    console.warn(`[perf] ${scenarioName}: cpu profile capture failed:`, captureError);
    if (profilerSession) await detachQuietly(profilerSession);
  }
};

const attachPerfReport = async (
  testInfo: TestInfo,
  scenarioName: string,
  aggregate: PerfScenarioAggregate,
  perSample: PerfScenarioAggregate[],
  instrumentation: PerfReportInputs,
  baseline: PerfScenarioAggregate | null = null,
  extra: Record<string, number> | undefined = undefined,
  memory: PerfMemoryMetrics | undefined = undefined,
): Promise<void> => {
  const runLabel = process.env.PERF_LABEL ?? "current";
  const reportJson = JSON.stringify(
    {
      schemaVersion: PERF_REPORT_SCHEMA_VERSION,
      scenario: scenarioName,
      label: runLabel,
      samples: perSample.length,
      warmupSamples: instrumentation.warmupSamples,
      environment: instrumentation.environment,
      workload: instrumentation.workload,
      aggregate,
      memory,
      processCpu: instrumentation.processCpu,
      hardwareGpu: instrumentation.hardwareGpu,
      rendering: instrumentation.renderTrace?.pipeline,
      compositing: instrumentation.renderTrace?.compositing,
      css: instrumentation.renderTrace?.css,
      animationLifecycle: instrumentation.renderTrace?.animationLifecycle,
      animationCounterfactual: instrumentation.animationCounterfactual,
      domMutationAttribution: instrumentation.domMutationAttribution,
      validity: {
        samples: instrumentation.validity,
        renderReplay: instrumentation.renderTrace?.validity,
      },
      capabilities: {
        browserGpuInfo: instrumentation.environment.gpu.available,
        processCpu: instrumentation.processCpu.aggregate.available,
        hardwareGpu: instrumentation.hardwareGpu.aggregate.status,
        renderTrace: instrumentation.renderTrace
          ? instrumentation.renderTrace.available
          : "not-requested",
        animationCounterfactual: Boolean(instrumentation.animationCounterfactual),
        domMutationAttribution: instrumentation.domMutationAttribution
          ? instrumentation.domMutationAttribution.available
          : "not-requested",
        headedValidity: instrumentation.validity.aggregate.validForHeadedMeasurement,
      },
      artifacts:
        instrumentation.renderTrace?.artifact || instrumentation.domMutationAttribution?.artifact
          ? {
              renderTrace: instrumentation.renderTrace?.artifact,
              domMutationAttribution: instrumentation.domMutationAttribution?.artifact,
            }
          : undefined,
      warnings: [
        ...(instrumentation.renderTrace?.warnings ?? []),
        ...(instrumentation.domMutationAttribution?.warnings ?? []),
      ],
      extra,
      // Skip perSample when there's only one — it would just duplicate aggregate.
      perSample: perSample.length > 1 ? perSample : undefined,
      baseline,
      recordedAt: new Date().toISOString(),
    },
    null,
    2,
  );
  await testInfo.attach(`perf-${scenarioName}.json`, {
    body: reportJson,
    contentType: "application/json",
  });
  // Mirror to packages/react-grab/perf/<label>/ so the file is diff-able
  // across branches without parsing the Playwright HTML report.
  const labelDirPath = resolve(PACKAGE_PERF_DIR, runLabel);
  await mkdir(labelDirPath, { recursive: true });
  await writeFile(resolve(labelDirPath, `${scenarioName}.json`), reportJson);
};

export const idleFrame = (page: Page, frameCount = 1) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolveTimer) => {
        let remaining = count;
        const tick = (): void => {
          remaining -= 1;
          if (remaining <= 0) resolveTimer();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frameCount,
  );

const medianOfNumbers = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sortedValues = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedValues.length / 2);
  // Average the two middle values for even-length samples so 2-sample
  // medians aren't biased toward the upper sample.
  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
};

const medianCssActivity = (samples: PerfScenarioAggregate[]): PerfCssActivity => {
  const mutationTargetCounts = new Map<string, number>();
  for (const sample of samples) {
    for (const mutationTarget of sample.cssActivity.topMutationTargets) {
      mutationTargetCounts.set(
        mutationTarget.target,
        (mutationTargetCounts.get(mutationTarget.target) ?? 0) + mutationTarget.count,
      );
    }
  }
  const medianMetric = (getValue: (activity: PerfCssActivity) => number): number =>
    medianOfNumbers(samples.map((sample) => getValue(sample.cssActivity)));
  return {
    attributeChanges: medianMetric((activity) => activity.attributeChanges),
    classChanges: medianMetric((activity) => activity.classChanges),
    inlineStyleChanges: medianMetric((activity) => activity.inlineStyleChanges),
    childListChanges: medianMetric((activity) => activity.childListChanges),
    addedNodes: medianMetric((activity) => activity.addedNodes),
    removedNodes: medianMetric((activity) => activity.removedNodes),
    animationStarts: medianMetric((activity) => activity.animationStarts),
    animationIterations: medianMetric((activity) => activity.animationIterations),
    animationEnds: medianMetric((activity) => activity.animationEnds),
    animationCancels: medianMetric((activity) => activity.animationCancels),
    transitionRuns: medianMetric((activity) => activity.transitionRuns),
    transitionStarts: medianMetric((activity) => activity.transitionStarts),
    transitionEnds: medianMetric((activity) => activity.transitionEnds),
    transitionCancels: medianMetric((activity) => activity.transitionCancels),
    activeAnimationsAtStart: medianMetric((activity) => activity.activeAnimationsAtStart),
    activeAnimationsAtEnd: medianMetric((activity) => activity.activeAnimationsAtEnd),
    topMutationTargets: [...mutationTargetCounts.entries()]
      .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
      .slice(0, PERF_MUTATION_TARGET_LIMIT)
      .map(([target, count]) => ({ target, count: roundTo3(count / samples.length) })),
  };
};

const medianAcrossSamples = (samples: PerfScenarioAggregate[]): PerfScenarioAggregate => {
  return {
    inp: medianOfNumbers(samples.map((sample) => sample.inp)),
    interactions: medianOfNumbers(samples.map((sample) => sample.interactions)),
    longTasks: {
      count: medianOfNumbers(samples.map((sample) => sample.longTasks.count)),
      sum: medianOfNumbers(samples.map((sample) => sample.longTasks.sum)),
      max: medianOfNumbers(samples.map((sample) => sample.longTasks.max)),
    },
    longAnimationFrames: {
      count: medianOfNumbers(samples.map((sample) => sample.longAnimationFrames.count)),
      sum: medianOfNumbers(samples.map((sample) => sample.longAnimationFrames.sum)),
      max: medianOfNumbers(samples.map((sample) => sample.longAnimationFrames.max)),
      maxBlocking: medianOfNumbers(samples.map((sample) => sample.longAnimationFrames.maxBlocking)),
    },
    frames: {
      count: medianOfNumbers(samples.map((sample) => sample.frames.count)),
      mean: medianOfNumbers(samples.map((sample) => sample.frames.mean)),
      stddev: medianOfNumbers(samples.map((sample) => sample.frames.stddev)),
      median: medianOfNumbers(samples.map((sample) => sample.frames.median)),
      p95: medianOfNumbers(samples.map((sample) => sample.frames.p95)),
      max: medianOfNumbers(samples.map((sample) => sample.frames.max)),
    },
    fps: {
      mean: medianOfNumbers(samples.map((sample) => sample.fps.mean)),
      p5Low: medianOfNumbers(samples.map((sample) => sample.fps.p5Low)),
      droppedFrames: medianOfNumbers(samples.map((sample) => sample.fps.droppedFrames)),
      droppedFramePercent: medianOfNumbers(samples.map((sample) => sample.fps.droppedFramePercent)),
      refreshIntervalMs: medianOfNumbers(samples.map((sample) => sample.fps.refreshIntervalMs)),
      refreshRateHz: medianOfNumbers(samples.map((sample) => sample.fps.refreshRateHz)),
    },
    cssActivity: medianCssActivity(samples),
  };
};

export const loadCommittedBaseline = async (
  scenarioName: string,
): Promise<PerfScenarioAggregate | null> => {
  const baselinePath = resolve(PACKAGE_PERF_DIR, "baseline", `${scenarioName}.json`);
  // `parsed.aggregate` is the canonical baseline value for this scenario,
  // not `parsed.baseline` — that's a historical snapshot of the *previous*
  // baseline carried inside each baseline file for traceability.
  let baselineRaw: string;
  try {
    baselineRaw = await readFile(baselinePath, "utf8");
  } catch (readError) {
    if ((readError as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw readError;
  }
  const parsed = JSON.parse(baselineRaw) as { aggregate?: PerfScenarioAggregate };
  return parsed.aggregate ?? null;
};

export interface RecordScenarioOptions {
  samples?: number;
  warmupSamples?: number;
  baseline?: PerfScenarioAggregate | null;
  /**
   * Runs OUTSIDE the recorded window before each sample. Use this for
   * per-sample setup that should not be measured — e.g. re-activating
   * react-grab for scenarios whose body deactivates as part of the
   * measured work, so sample 2..N don't start with no active selection
   * and silently measure no-op iterations.
   */
  beforeEachSample?: () => Promise<void>;
  /**
   * Scenario-specific scalar metrics (in ms) the standard aggregate can't
   * express — e.g. an off-main-thread wait like source-resolution latency under
   * a saturated connection pool. Collected after the last sample and persisted
   * under `extra` in the report so the perf diff can surface it.
   */
  collectExtraMetrics?: () => Record<string, number>;
  collectWorkloadMetadata?: () => Promise<PerfScenarioMetadata>;
  /**
   * Captures one isolated CSS/compositor replay even when the full render-trace
   * lane is disabled. Use it for graphics-sensitive canaries that CI must diff.
   */
  captureRenderTrace?: boolean;
  /**
   * Runs three alternating active/paused pairs and a paused render replay so
   * continuously ticking CSS/compositor work can be separated from idle noise.
   */
  captureAnimationCounterfactual?: boolean;
  /**
   * Replays the scenario with CDP DOM breakpoints and captures paused call
   * stacks. This is intrusive source attribution and never supplies timings.
   */
  captureDomMutationAttribution?: boolean;
}

export const recordScenario = async (
  page: Page,
  testInfo: TestInfo,
  scenarioName: string,
  scenarioBody: () => Promise<void>,
  options: RecordScenarioOptions = {},
): Promise<PerfScenarioAggregate> => {
  const sampleCount = Math.max(1, options.samples ?? 3);
  const warmupSampleCount = Math.max(0, options.warmupSamples ?? 0);
  // Auto-load the committed baseline if the caller didn't pass one in
  // explicitly. The artifact JSON always carries the baseline reference
  // so diffs are doable straight from the file.
  const baseline =
    options.baseline === undefined ? await loadCommittedBaseline(scenarioName) : options.baseline;
  const environment = await capturePerfEnvironment(page);
  const workloadBefore = await capturePerfWorkload(page);
  for (let warmupIndex = 0; warmupIndex < warmupSampleCount; warmupIndex++) {
    if (options.beforeEachSample) await options.beforeEachSample();
    await scenarioBody();
  }
  let memoryProbe: CDPSession | null = null;
  let memoryBefore: PerfMemorySnapshot | null = null;
  try {
    memoryProbe = await startMemoryProbe(page);
    memoryBefore = await readMemorySnapshot(memoryProbe, page);
  } catch (probeError) {
    console.warn(`[perf] ${scenarioName}: memory probe unavailable:`, probeError);
  }
  const perSampleAggregates: PerfScenarioAggregate[] = [];
  const perSampleProcessCpu: PerfProcessCpuSample[] = [];
  const perSampleHardwareGpu: PerfHardwareGpuSample[] = [];
  const perSampleMemoryDeltas: PerfMemorySnapshot[] = [];
  const perSampleValidity: PerfRunValiditySummary[] = [];
  let previousMemorySnapshot = memoryBefore;
  let lastMemorySnapshot: PerfMemorySnapshot | null = null;
  let memory: PerfMemoryMetrics | undefined;
  // try/finally so the probe's CDP session detaches even if a sample throws.
  try {
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
      if (options.beforeEachSample) await options.beforeEachSample();
      const validityProbe = await startPerfRunValidityProbe(page);
      const hardwareGpuProbe = await startHardwareGpuProbe(page, environment.gpu);
      const processCpuProbe = await startProcessCpuProbe(page, environment.host.logicalCpuCount);
      let rawSnapshot: PerfRawSnapshot | null = null;
      try {
        await startRecording(page);
        try {
          await scenarioBody();
        } finally {
          rawSnapshot = await stopRecording(page);
        }
      } finally {
        perSampleProcessCpu.push(await processCpuProbe.stop());
        perSampleHardwareGpu.push(await hardwareGpuProbe.stop());
        const validity = await validityProbe.stop();
        perSampleValidity.push(validity);
        assertValidHeadedPerfRun(validity, `${scenarioName} sample ${sampleIndex + 1}`);
      }
      if (!rawSnapshot)
        throw new Error(`Perf sample ${sampleIndex + 1} produced no browser metrics`);
      perSampleAggregates.push(
        aggregateRawSnapshot(rawSnapshot, environment.page.refreshIntervalMs),
      );
      // Snapshot after every sample so memory growth can be aggregated
      // per-sample (median) instead of one whole-scenario window. The
      // sample-0 delta is recorded but excluded when other samples exist:
      // one-time warmup allocations (JIT code objects, lazily-initialized
      // module state, framework caches) land there and vary run to run,
      // while steady-state per-iteration growth is the actual leak signal.
      if (memoryProbe && previousMemorySnapshot) {
        try {
          const sampleEndSnapshot = await readMemorySnapshot(memoryProbe, page);
          perSampleMemoryDeltas.push(
            diffMemorySnapshots(previousMemorySnapshot, sampleEndSnapshot),
          );
          previousMemorySnapshot = sampleEndSnapshot;
          lastMemorySnapshot = sampleEndSnapshot;
        } catch (probeError) {
          console.warn(`[perf] ${scenarioName}: memory read failed:`, probeError);
        }
      }
    }
    if (memoryBefore && lastMemorySnapshot && perSampleMemoryDeltas.length > 0) {
      const steadyStateDeltas =
        perSampleMemoryDeltas.length > 1 ? perSampleMemoryDeltas.slice(1) : perSampleMemoryDeltas;
      memory = {
        before: memoryBefore,
        after: lastMemorySnapshot,
        delta: medianMemoryDelta(steadyStateDeltas),
      };
    }
  } finally {
    if (memoryProbe) await detachQuietly(memoryProbe);
  }
  const animationCounterfactual = options.captureAnimationCounterfactual
    ? await captureAnimationCounterfactual(
        page,
        scenarioName,
        environment.host.logicalCpuCount,
        scenarioBody,
        options.beforeEachSample,
      )
    : undefined;
  // The CPU profile is captured on a dedicated extra pass so the sampler's
  // overhead (and its sporadic renderer stall — see the comment above
  // CPU_PROFILE_SAMPLING_INTERVAL_US) never pollutes the metric samples or
  // fails the test.
  if (process.env.PERF_TRACE === "1") {
    if (options.beforeEachSample) await options.beforeEachSample();
    await captureScenarioCpuProfile(page, testInfo, scenarioName, scenarioBody);
  }
  let renderTrace: PerfRenderTraceReport | undefined;
  if (process.env.PERF_RENDER_TRACE === "1" || options.captureRenderTrace === true) {
    if (options.beforeEachSample) await options.beforeEachSample();
    renderTrace = await captureRenderTrace(
      page,
      testInfo,
      scenarioName,
      PACKAGE_PERF_DIR,
      scenarioBody,
    );
    if (renderTrace.validity) {
      assertValidHeadedPerfRun(renderTrace.validity, `${scenarioName} render replay`);
    }
    if (animationCounterfactual) animationCounterfactual.activeRenderTrace = renderTrace;
  }
  if (animationCounterfactual) {
    if (options.beforeEachSample) await options.beforeEachSample();
    await pauseRunningAnimations(page);
    try {
      animationCounterfactual.pausedRenderTrace = await captureRenderTrace(
        page,
        testInfo,
        `${scenarioName}-animations-paused`,
        PACKAGE_PERF_DIR,
        scenarioBody,
      );
      if (animationCounterfactual.pausedRenderTrace.validity) {
        assertValidHeadedPerfRun(
          animationCounterfactual.pausedRenderTrace.validity,
          `${scenarioName} paused render replay`,
        );
      }
    } finally {
      await resumePausedAnimations(page);
    }
  }
  let domMutationAttribution: PerfDomMutationAttributionReport | undefined;
  if (process.env.PERF_DOM_BREAKPOINTS === "1" || options.captureDomMutationAttribution === true) {
    if (options.beforeEachSample) await options.beforeEachSample();
    const attributionAggregate =
      perSampleAggregates.length === 1
        ? perSampleAggregates[0]
        : medianAcrossSamples(perSampleAggregates);
    domMutationAttribution = await captureDomMutationAttribution(
      page,
      testInfo,
      scenarioName,
      PACKAGE_PERF_DIR,
      attributionAggregate.cssActivity.topMutationTargets.map(
        (mutationTarget) => mutationTarget.target,
      ),
      scenarioBody,
    );
    if (domMutationAttribution.validity) {
      assertValidHeadedPerfRun(
        domMutationAttribution.validity,
        `${scenarioName} DOM breakpoint replay`,
      );
    }
  }
  const workloadAfter = await capturePerfWorkload(page);
  const workloadMetadata = await options.collectWorkloadMetadata?.();
  const processCpu = aggregateProcessCpuSamples(perSampleProcessCpu);
  const hardwareGpu = aggregateHardwareGpuSamples(perSampleHardwareGpu);
  const medianAggregate =
    perSampleAggregates.length === 1
      ? perSampleAggregates[0]
      : medianAcrossSamples(perSampleAggregates);
  const extra = options.collectExtraMetrics?.();
  await attachPerfReport(
    testInfo,
    scenarioName,
    medianAggregate,
    perSampleAggregates,
    {
      environment,
      workload: {
        before: workloadBefore,
        after: workloadAfter,
        metadata: workloadMetadata,
      },
      processCpu,
      hardwareGpu,
      renderTrace,
      validity: aggregatePerfRunValidity(perSampleValidity),
      animationCounterfactual,
      domMutationAttribution,
      warmupSamples: warmupSampleCount,
    },
    baseline,
    extra,
    memory,
  );
  logAggregate(
    scenarioName,
    medianAggregate,
    memory,
    processCpu,
    hardwareGpu,
    renderTrace,
    animationCounterfactual,
  );
  if (extra) {
    console.log(
      `  ${Object.entries(extra)
        .map(([key, value]) => `${key}=${Math.round(value)}ms`)
        .join("  ")}`,
    );
  }
  return medianAggregate;
};

const logAggregate = (
  scenarioName: string,
  aggregate: PerfScenarioAggregate,
  memory: PerfMemoryMetrics | undefined,
  processCpu: PerfProcessCpuMetrics,
  hardwareGpu: PerfHardwareGpuMetrics,
  renderTrace: PerfRenderTraceReport | undefined,
  animationCounterfactual: PerfAnimationCounterfactualReport | undefined,
): void => {
  const memoryLine = memory
    ? `\n  memory Δheap=${memory.delta.jsHeapUsedKb}KB Δnodes=${memory.delta.domNodes} ` +
      `Δlisteners=${memory.delta.jsEventListeners} Δdocuments=${memory.delta.documents} ` +
      `(heap ${memory.after.jsHeapUsedKb}KB, nodes ${memory.after.domNodes})`
    : "";
  const processCpuLine = processCpu.aggregate.available
    ? `\n  browser CPU=${processCpu.aggregate.totalCorePercent}% cores ` +
      `(host ${processCpu.aggregate.hostNormalizedPercent}%, harness ${processCpu.aggregate.harnessCorePercent}%) ` +
      `renderer=${processCpu.aggregate.byType.renderer?.corePercent ?? 0}% ` +
      `gpu-process=${processCpu.aggregate.byType.GPU?.corePercent ?? processCpu.aggregate.byType.gpu?.corePercent ?? 0}%`
    : `\n  browser CPU unavailable: ${processCpu.aggregate.error ?? "unknown error"}`;
  const hardwareGpuLine =
    hardwareGpu.aggregate.status === "available"
      ? `\n  hardware GPU=${hardwareGpu.aggregate.browserBusyMeanPercent ?? hardwareGpu.aggregate.systemBusyMeanPercent ?? 0}% ` +
        `(max ${hardwareGpu.aggregate.browserBusyMaxPercent ?? hardwareGpu.aggregate.systemBusyMaxPercent ?? 0}%, ${hardwareGpu.aggregate.backend})`
      : `\n  hardware GPU ${hardwareGpu.aggregate.status}: ${hardwareGpu.aggregate.error ?? hardwareGpu.aggregate.backend}`;
  const cssLine =
    `\n  CSS mutations=${aggregate.cssActivity.attributeChanges} attributes/` +
    `${aggregate.cssActivity.childListChanges} child lists animations=` +
    `${aggregate.cssActivity.activeAnimationsAtStart}→${aggregate.cssActivity.activeAnimationsAtEnd}`;
  const renderTraceLine = renderTrace?.available
    ? `\n  rendering style=${renderTrace.pipeline?.style.totalDurationMs ?? 0}ms ` +
      `layout=${renderTrace.pipeline?.layout.totalDurationMs ?? 0}ms ` +
      `paint=${renderTrace.pipeline?.paint.totalDurationMs ?? 0}ms ` +
      `raster=${renderTrace.pipeline?.raster.totalDurationMs ?? 0}ms ` +
      `compositor=${renderTrace.pipeline?.compositor.totalDurationMs ?? 0}ms ` +
      `viz=${renderTrace.pipeline?.viz.totalDurationMs ?? 0}ms ` +
      `production=${renderTrace.pipeline?.frames.productionRateFps ?? 0}fps/` +
      `${renderTrace.pipeline?.frames.productionDutyCyclePercent ?? 0}% duty` +
      ` animation=${renderTrace.pipeline?.animationScheduling.animationTicksPerSecond ?? 0} ticks/s ` +
      `${renderTrace.pipeline?.animationScheduling.drawsPerAnimationTick ?? 0} draws/tick ` +
      `${renderTrace.animationLifecycle?.activeTimelineDutyCyclePercent ?? 0}% timeline` +
      ` layers=${renderTrace.compositing?.maximumContentLayerCount ?? 0}/` +
      `${renderTrace.compositing?.maximumClippedContentAreaViewportMultiple ?? 0}x viewport`
    : "";
  const animationCounterfactualLine = animationCounterfactual
    ? `\n  animation CPU active−paused renderer=${animationCounterfactual.activeMinusPaused.rendererCorePercent}% ` +
      `gpu-process=${animationCounterfactual.activeMinusPaused.gpuProcessCorePercent}% ` +
      `combined=${animationCounterfactual.activeMinusPaused.combinedGraphicsPipelineCorePercent}%`
    : "";
  // eslint-disable-next-line no-console
  console.log(
    `\n[perf] ${scenarioName}\n` +
      `  inp=${aggregate.inp}ms (${aggregate.interactions} interactions)  ` +
      `longTasks=${aggregate.longTasks.count}/${aggregate.longTasks.sum}ms (max ${aggregate.longTasks.max}ms)\n` +
      `  loaf=${aggregate.longAnimationFrames.count}/${aggregate.longAnimationFrames.sum}ms ` +
      `(max ${aggregate.longAnimationFrames.max}ms, blocking ${aggregate.longAnimationFrames.maxBlocking}ms)\n` +
      `  frames p50=${aggregate.frames.median}ms p95=${aggregate.frames.p95}ms max=${aggregate.frames.max}ms (${aggregate.frames.count} frames)\n` +
      `  fps mean=${aggregate.fps.mean} p5Low=${aggregate.fps.p5Low} dropped=${aggregate.fps.droppedFrames} (${aggregate.fps.droppedFramePercent}%)` +
      memoryLine +
      processCpuLine +
      hardwareGpuLine +
      cssLine +
      renderTraceLine +
      animationCounterfactualLine,
  );
};
