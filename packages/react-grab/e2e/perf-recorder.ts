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
  isRecording: boolean;
  frameDeltas: number[];
  events: PerfEventEntry[];
  longTasks: PerfLongTaskEntry[];
  longAnimationFrames: PerfLongAnimationFrameEntry[];
  measures: PerfMeasureEntry[];
  inpInteractionMap: Map<number, number>;
  rafHandle: number;
  observer: PerformanceObserver | null;
  nextFrameTimestamp: number | null;
  _flushPending?: (entries: PerformanceEntryList) => void;
  start(): void;
  stop(): PerfRawSnapshot;
}

interface PerfEventEntry {
  name: string;
  duration: number;
  processingStart: number;
  processingEnd: number;
  interactionId: number;
  startTime: number;
}

interface PerfLongTaskEntry {
  startTime: number;
  duration: number;
}

interface PerfLongAnimationFrameEntry {
  startTime: number;
  duration: number;
  renderStart?: number;
  styleAndLayoutStart?: number;
  blockingDuration?: number;
  firstUIEventTimestamp?: number;
  scriptCount: number;
}

interface PerfMeasureEntry {
  name: string;
  duration: number;
}

export interface PerfRawSnapshot {
  frameDeltas: number[];
  events: PerfEventEntry[];
  longTasks: PerfLongTaskEntry[];
  longAnimationFrames: PerfLongAnimationFrameEntry[];
  measures: PerfMeasureEntry[];
  inp: number;
  interactionCount: number;
}

export interface PerfStatsSummary {
  count: number;
  total: number;
  mean: number;
  median: number;
  p75: number;
  p95: number;
  p99: number;
  max: number;
}

export interface PerfScenarioAggregate {
  inp: number;
  interactions: number;
  eventTimings: PerfStatsSummary;
  longTasks: { count: number; sum: number; max: number };
  longAnimationFrames: {
    count: number;
    sum: number;
    maxDuration: number;
    maxBlockingDuration: number;
  };
  frames: PerfStatsSummary;
  measures: Record<string, PerfStatsSummary>;
}

// Injected into the page BEFORE any other script via context.addInitScript.
// All `performance.mark`/`performance.measure` calls emitted by the
// react-grab profiling build land in the same PerformanceObserver buffer,
// alongside the browser-native Event Timing, Long Tasks, and Long Animation
// Frames entries. We aggregate at scenario-end to keep per-frame overhead
// to a single observer.
export const installPerfRecorderScript = () => {
  if (window.__PERF_BENCH__) return;
  const recorder: PerfBenchRecorder = {
    isRecording: false,
    frameDeltas: [],
    events: [],
    longTasks: [],
    longAnimationFrames: [],
    measures: [],
    inpInteractionMap: new Map(),
    rafHandle: 0,
    observer: null,
    nextFrameTimestamp: null,
    start() {
      this.isRecording = true;
      this.frameDeltas = [];
      this.events = [];
      this.longTasks = [];
      this.longAnimationFrames = [];
      this.measures = [];
      this.inpInteractionMap = new Map();
      this.nextFrameTimestamp = null;

      // Both the observer callback and the `stop()` takeRecords() flush feed
      // the same ingestion path. Stash an arrow handle so it can be reused
      // from `stop()` without re-binding `this`.
      const ingestEntries = (entries: PerformanceEntryList): void => {
        for (const entry of entries) {
          if (entry.entryType === "event" || entry.entryType === "first-input") {
            const eventEntry = entry as PerformanceEventTiming;
            const interactionId = eventEntry.interactionId ?? 0;
            this.events.push({
              name: eventEntry.name,
              duration: eventEntry.duration,
              processingStart: eventEntry.processingStart - eventEntry.startTime,
              processingEnd: eventEntry.processingEnd - eventEntry.startTime,
              interactionId,
              startTime: eventEntry.startTime,
            });
            if (interactionId > 0) {
              const existingDuration = this.inpInteractionMap.get(interactionId);
              if (existingDuration === undefined || eventEntry.duration > existingDuration) {
                this.inpInteractionMap.set(interactionId, eventEntry.duration);
              }
            }
          } else if (entry.entryType === "longtask") {
            this.longTasks.push({
              startTime: entry.startTime,
              duration: entry.duration,
            });
          } else if (entry.entryType === "long-animation-frame") {
            const loafEntry = entry as PerformanceEntry & {
              renderStart?: number;
              styleAndLayoutStart?: number;
              blockingDuration?: number;
              firstUIEventTimestamp?: number;
              scripts?: unknown[];
            };
            this.longAnimationFrames.push({
              startTime: entry.startTime,
              duration: entry.duration,
              renderStart: loafEntry.renderStart,
              styleAndLayoutStart: loafEntry.styleAndLayoutStart,
              blockingDuration: loafEntry.blockingDuration,
              firstUIEventTimestamp: loafEntry.firstUIEventTimestamp,
              scriptCount: Array.isArray(loafEntry.scripts) ? loafEntry.scripts.length : 0,
            });
          } else if (entry.entryType === "measure" && entry.name.startsWith("rg:")) {
            this.measures.push({ name: entry.name, duration: entry.duration });
          }
        }
      };
      this._flushPending = ingestEntries;

      const observer = new PerformanceObserver((list) => {
        ingestEntries(list.getEntries());
      });
      // `durationThreshold` is a Chromium extension to PerformanceObserverInit
      // (not yet in lib.dom.d.ts). 16ms keeps the noise floor low while still
      // catching every event slow enough to drop a frame.
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
          // Older Chromium may lack long-animation-frame, etc.
        }
      }
      this.observer = observer;

      const rafTick = (timestamp: number): void => {
        if (!this.isRecording) return;
        if (this.nextFrameTimestamp !== null) {
          this.frameDeltas.push(timestamp - this.nextFrameTimestamp);
        }
        this.nextFrameTimestamp = timestamp;
        this.rafHandle = requestAnimationFrame(rafTick);
      };
      this.rafHandle = requestAnimationFrame(rafTick);
    },
    stop(): PerfRawSnapshot {
      this.isRecording = false;
      if (this.observer) {
        try {
          // Flush any entries the observer batched but hadn't dispatched yet
          // before disconnect drops them.
          const pendingEntries = this.observer.takeRecords();
          if (pendingEntries.length > 0 && this._flushPending) {
            this._flushPending(pendingEntries);
          }
        } catch {
          // ignore
        }
        try {
          this.observer.disconnect();
        } catch {
          // ignore
        }
      }
      this.observer = null;
      if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
      this.rafHandle = 0;

      const interactionDurations = [...this.inpInteractionMap.values()].sort((a, b) => b - a);
      const interactionCount = interactionDurations.length;
      // INP per WebVitals convention: 98th-percentile worst interaction.
      const inp =
        interactionCount === 0
          ? 0
          : (interactionDurations[Math.floor(interactionCount * 0.02)] ??
            interactionDurations[0] ??
            0);

      const snapshot: PerfRawSnapshot = {
        frameDeltas: this.frameDeltas.slice(),
        events: this.events.slice(),
        longTasks: this.longTasks.slice(),
        longAnimationFrames: this.longAnimationFrames.slice(),
        measures: this.measures.slice(),
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
  window.__PERF_BENCH__ = recorder;
};

const summarize = (values: number[]): PerfStatsSummary => {
  if (values.length === 0) {
    return { count: 0, total: 0, mean: 0, median: 0, p75: 0, p95: 0, p99: 0, max: 0 };
  }
  const sortedValues = [...values].sort((a, b) => a - b);
  const sumOfValues = sortedValues.reduce((accum, value) => accum + value, 0);
  const pickPercentile = (percentile: number): number =>
    sortedValues[Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * percentile))];
  return {
    count: sortedValues.length,
    total: Number(sumOfValues.toFixed(3)),
    mean: Number((sumOfValues / sortedValues.length).toFixed(3)),
    median: Number(pickPercentile(0.5).toFixed(3)),
    p75: Number(pickPercentile(0.75).toFixed(3)),
    p95: Number(pickPercentile(0.95).toFixed(3)),
    p99: Number(pickPercentile(0.99).toFixed(3)),
    max: Number(sortedValues[sortedValues.length - 1].toFixed(3)),
  };
};

export const aggregateRawSnapshot = (rawSnapshot: PerfRawSnapshot): PerfScenarioAggregate => {
  const measureDurationsByName = new Map<string, number[]>();
  for (const measureEntry of rawSnapshot.measures) {
    const namespacedKey = measureEntry.name.startsWith("rg:")
      ? measureEntry.name.slice("rg:".length)
      : measureEntry.name;
    const existingDurations = measureDurationsByName.get(namespacedKey) ?? [];
    existingDurations.push(measureEntry.duration);
    measureDurationsByName.set(namespacedKey, existingDurations);
  }
  const measureSummaries: Record<string, PerfStatsSummary> = {};
  for (const [measureName, durations] of measureDurationsByName) {
    measureSummaries[measureName] = summarize(durations);
  }

  return {
    inp: Number(rawSnapshot.inp.toFixed(3)),
    interactions: rawSnapshot.interactionCount,
    eventTimings: summarize(rawSnapshot.events.map((entry) => entry.duration)),
    longTasks: {
      count: rawSnapshot.longTasks.length,
      sum: Number(
        rawSnapshot.longTasks.reduce((accum, task) => accum + task.duration, 0).toFixed(3),
      ),
      max: Number(
        rawSnapshot.longTasks.reduce((accum, task) => Math.max(accum, task.duration), 0).toFixed(3),
      ),
    },
    longAnimationFrames: {
      count: rawSnapshot.longAnimationFrames.length,
      sum: Number(
        rawSnapshot.longAnimationFrames
          .reduce((accum, frame) => accum + frame.duration, 0)
          .toFixed(3),
      ),
      maxDuration: Number(
        rawSnapshot.longAnimationFrames
          .reduce((accum, frame) => Math.max(accum, frame.duration), 0)
          .toFixed(3),
      ),
      maxBlockingDuration: Number(
        rawSnapshot.longAnimationFrames
          .reduce((accum, frame) => Math.max(accum, frame.blockingDuration ?? 0), 0)
          .toFixed(3),
      ),
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
  rawSnapshot?: PerfRawSnapshot,
): Promise<void> => {
  const runLabel = process.env.PERF_LABEL ?? "current";
  const aggregateJson = JSON.stringify(
    {
      scenario: scenarioName,
      label: runLabel,
      aggregate,
      gitSha: process.env.GIT_SHA ?? null,
      recordedAt: new Date().toISOString(),
    },
    null,
    2,
  );

  await testInfo.attach(`perf-${scenarioName}.json`, {
    body: aggregateJson,
    contentType: "application/json",
  });

  // Mirror to packages/react-grab/perf so it's diff-able across branches.
  // Each scenario keeps its own file so labels can be overlaid without races.
  const perfOutputDir = resolve(PACKAGE_PERF_DIR, runLabel);
  await mkdir(perfOutputDir, { recursive: true });
  await writeFile(resolve(perfOutputDir, `${scenarioName}.json`), aggregateJson);

  if (rawSnapshot && process.env.PERF_ATTACH_RAW === "1") {
    const rawJson = JSON.stringify(rawSnapshot, null, 2);
    await testInfo.attach(`perf-${scenarioName}.raw.json`, {
      body: rawJson,
      contentType: "application/json",
    });
    await writeFile(resolve(perfOutputDir, `${scenarioName}.raw.json`), rawJson);
  }
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
