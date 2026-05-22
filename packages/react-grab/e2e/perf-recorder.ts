import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, TestInfo } from "@playwright/test";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_PERF_DIR = resolve(E2E_DIR, "../perf");

declare global {
  interface Window {
    __PERF_BENCH__?: PerfBenchRecorder;
  }
}

interface PerfBenchRecorder {
  start(): void;
  stop(): PerfRawSnapshot;
}

export interface PerfRawSnapshot {
  frameDeltas: number[];
  longTasks: number[];
  longAnimationFrames: Array<{ duration: number; blockingDuration: number }>;
  measures: Array<{ name: string; duration: number }>;
  inp: number;
  interactionCount: number;
}

export interface PerfStatsSummary {
  count: number;
  median: number;
  p95: number;
  max: number;
}

export interface PerfScenarioAggregate {
  inp: number;
  interactions: number;
  longTasks: { count: number; sum: number; max: number };
  longAnimationFrames: { count: number; sum: number; max: number; maxBlocking: number };
  frames: PerfStatsSummary;
  measures: Record<string, PerfStatsSummary>;
}

// Injected via context.addInitScript BEFORE any other script. Dormant until
// `__PERF_BENCH__.start()` so non-perf tests pay zero runtime cost.
export const installPerfRecorderScript = () => {
  if (window.__PERF_BENCH__) return;
  let isRecording = false;
  let frameDeltas: number[] = [];
  let longTasks: number[] = [];
  let longAnimationFrames: Array<{ duration: number; blockingDuration: number }> = [];
  let measures: Array<{ name: string; duration: number }> = [];
  let inpInteractionMap = new Map<number, number>();
  let observer: PerformanceObserver | null = null;
  let rafHandle = 0;
  let previousFrameTimestamp: number | null = null;

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
      } else if (entry.entryType === "measure" && entry.name.startsWith("rg:")) {
        measures.push({ name: entry.name, duration: entry.duration });
      }
    }
  };

  window.__PERF_BENCH__ = {
    start() {
      isRecording = true;
      frameDeltas = [];
      longTasks = [];
      longAnimationFrames = [];
      measures = [];
      inpInteractionMap = new Map();
      previousFrameTimestamp = null;

      observer = new PerformanceObserver((list) => ingest(list.getEntries()));
      // `durationThreshold` is a Chromium extension not in lib.dom.d.ts yet;
      // 16ms keeps the noise floor low while catching every frame-dropping event.
      const observerOptionsList: PerformanceObserverInit[] = [
        { type: "event", buffered: false, durationThreshold: 16 } as PerformanceObserverInit & {
          durationThreshold: number;
        },
        { type: "longtask", buffered: false },
        { type: "long-animation-frame", buffered: false },
        { type: "measure", buffered: false },
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
      if (rafHandle) cancelAnimationFrame(rafHandle);
      rafHandle = 0;

      const interactionDurations = [...inpInteractionMap.values()].sort((a, b) => b - a);
      const interactionCount = interactionDurations.length;
      // INP per web-vitals convention: 98th-percentile worst interaction.
      const inp =
        interactionCount === 0
          ? 0
          : (interactionDurations[Math.floor(interactionCount * 0.02)] ?? 0);

      const snapshot: PerfRawSnapshot = {
        frameDeltas: frameDeltas.slice(),
        longTasks: longTasks.slice(),
        longAnimationFrames: longAnimationFrames.slice(),
        measures: measures.slice(),
        inp,
        interactionCount,
      };

      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch {
        // ignore
      }
      return snapshot;
    },
  };
};

const summarize = (values: number[]): PerfStatsSummary => {
  if (values.length === 0) return { count: 0, median: 0, p95: 0, max: 0 };
  const sortedValues = [...values].sort((a, b) => a - b);
  const pickPercentile = (percentile: number): number =>
    sortedValues[Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * percentile))];
  return {
    count: sortedValues.length,
    median: Number(pickPercentile(0.5).toFixed(3)),
    p95: Number(pickPercentile(0.95).toFixed(3)),
    max: Number(sortedValues[sortedValues.length - 1].toFixed(3)),
  };
};

const sumOf = (values: number[]): number =>
  Number(values.reduce((accum, value) => accum + value, 0).toFixed(3));

const maxOf = (values: number[]): number =>
  values.length === 0 ? 0 : Number(Math.max(...values).toFixed(3));

export const aggregateRawSnapshot = (rawSnapshot: PerfRawSnapshot): PerfScenarioAggregate => {
  const measureDurationsByName = new Map<string, number[]>();
  for (const measureEntry of rawSnapshot.measures) {
    const namespacedKey = measureEntry.name.slice("rg:".length);
    const bucket = measureDurationsByName.get(namespacedKey) ?? [];
    bucket.push(measureEntry.duration);
    measureDurationsByName.set(namespacedKey, bucket);
  }
  const measureSummaries: Record<string, PerfStatsSummary> = {};
  for (const [measureName, durations] of measureDurationsByName) {
    measureSummaries[measureName] = summarize(durations);
  }

  const loafDurations = rawSnapshot.longAnimationFrames.map((frame) => frame.duration);
  const loafBlocking = rawSnapshot.longAnimationFrames.map((frame) => frame.blockingDuration);

  return {
    inp: Number(rawSnapshot.inp.toFixed(3)),
    interactions: rawSnapshot.interactionCount,
    longTasks: {
      count: rawSnapshot.longTasks.length,
      sum: sumOf(rawSnapshot.longTasks),
      max: maxOf(rawSnapshot.longTasks),
    },
    longAnimationFrames: {
      count: rawSnapshot.longAnimationFrames.length,
      sum: sumOf(loafDurations),
      max: maxOf(loafDurations),
      maxBlocking: maxOf(loafBlocking),
    },
    frames: summarize(rawSnapshot.frameDeltas),
    measures: measureSummaries,
  };
};

export const startRecording = (page: Page) =>
  page.evaluate(() => {
    if (!window.__PERF_BENCH__) throw new Error("perf recorder not installed");
    window.__PERF_BENCH__.start();
  });

export const stopRecording = (page: Page): Promise<PerfRawSnapshot> =>
  page.evaluate(() => {
    if (!window.__PERF_BENCH__) throw new Error("perf recorder not installed");
    return window.__PERF_BENCH__.stop();
  });

export const attachPerfReport = async (
  testInfo: TestInfo,
  scenarioName: string,
  aggregate: PerfScenarioAggregate,
): Promise<void> => {
  const runLabel = process.env.PERF_LABEL ?? "current";
  const reportJson = JSON.stringify(
    { scenario: scenarioName, label: runLabel, aggregate, recordedAt: new Date().toISOString() },
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
