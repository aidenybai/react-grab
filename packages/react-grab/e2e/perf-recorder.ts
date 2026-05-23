import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CDPSession, Page, TestInfo } from "@playwright/test";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_PERF_DIR = resolve(E2E_DIR, "../perf");

declare global {
  interface Window {
    __PERF_BENCH__?: { start(): void; stop(): PerfRawSnapshot };
  }
}

export interface PerfRawSnapshot {
  frameDeltas: number[];
  longTasks: number[];
  longAnimationFrames: Array<{ duration: number; blockingDuration: number }>;
  inp: number;
  interactionCount: number;
}

export interface PerfStatsSummary {
  count: number;
  mean: number;
  stddev: number;
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
}

// Installed lazily on the first `startRecording` call (via page.evaluate)
// so non-perf e2e tests pay zero JS-injection cost. All inputs are
// browser-native — we don't need any react-grab source instrumentation
// to capture them, and CDP Tracing would only surface the same data
// inside a 5-100MB trace blob that we'd then have to parse offline.
const installPerfRecorderScript = (): void => {
  if (window.__PERF_BENCH__) return;
  let isRecording = false;
  let frameDeltas: number[] = [];
  let longTasks: number[] = [];
  let longAnimationFrames: Array<{ duration: number; blockingDuration: number }> = [];
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
      }
    }
  };

  window.__PERF_BENCH__ = {
    start() {
      isRecording = true;
      frameDeltas = [];
      longTasks = [];
      longAnimationFrames = [];
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

      return {
        frameDeltas: frameDeltas.slice(),
        longTasks: longTasks.slice(),
        longAnimationFrames: longAnimationFrames.slice(),
        inp,
        interactionCount,
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

const sumOf = (values: number[]): number =>
  Number(values.reduce((accum, value) => accum + value, 0).toFixed(3));

const maxOf = (values: number[]): number =>
  values.length === 0 ? 0 : Number(Math.max(...values).toFixed(3));

export const aggregateRawSnapshot = (rawSnapshot: PerfRawSnapshot): PerfScenarioAggregate => {
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
  };
};

export const startRecording = async (page: Page): Promise<void> => {
  await page.evaluate(installPerfRecorderScript);
  await page.evaluate(() => window.__PERF_BENCH__!.start());
};

export const stopRecording = (page: Page): Promise<PerfRawSnapshot> =>
  page.evaluate(() => {
    if (!window.__PERF_BENCH__) throw new Error("perf recorder not installed");
    return window.__PERF_BENCH__.stop();
  });

// --- Optional Chrome CPU trace capture ----------------------------------
//
// Enabled with PERF_TRACE=1. Streams the chrome://tracing JSON for the
// scenario window via CDP and writes it to perf/<label>/<scenario>.trace.json.
// Drop the resulting file into Chrome DevTools "Performance" panel
// (or `chrome://tracing`) for full flame chart + function-level attribution.
// Use with `pnpm build:profiling` so the trace shows readable function names
// instead of minified `B`/`na`/etc.

interface CdpTraceCapture {
  events: unknown[];
  cdpSession: CDPSession;
  onDataCollected: (payload: { value: unknown[] }) => void;
  onComplete: () => void;
  completionPromise: Promise<void>;
}

export const startCdpTrace = async (page: Page): Promise<CdpTraceCapture | null> => {
  if (process.env.PERF_TRACE !== "1") return null;
  const cdpSession = await page.context().newCDPSession(page);
  const events: unknown[] = [];
  let resolveComplete: () => void = () => {};
  const completionPromise = new Promise<void>((resolveTimer) => {
    resolveComplete = resolveTimer;
  });
  const onDataCollected = (payload: { value: unknown[] }): void => {
    if (Array.isArray(payload?.value)) events.push(...payload.value);
  };
  const onComplete = (): void => resolveComplete();
  cdpSession.on("Tracing.dataCollected", onDataCollected);
  cdpSession.on("Tracing.tracingComplete", onComplete);
  await cdpSession.send("Tracing.start", {
    transferMode: "ReportEvents",
    // Same categories DevTools "Performance" uses by default. Includes the
    // V8 sampling CPU profiler so function-level cost is attributable.
    categories: [
      "blink.user_timing",
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
      "disabled-by-default-devtools.timeline.stack",
      "disabled-by-default-v8.cpu_profiler",
      "loading",
      "v8.execute",
    ].join(","),
  });
  return { events, cdpSession, onDataCollected, onComplete, completionPromise };
};

export const stopCdpTrace = async (
  testInfo: TestInfo,
  scenarioName: string,
  capture: CdpTraceCapture | null,
): Promise<void> => {
  if (!capture) return;
  await capture.cdpSession.send("Tracing.end");
  await capture.completionPromise;
  capture.cdpSession.off("Tracing.dataCollected", capture.onDataCollected);
  capture.cdpSession.off("Tracing.tracingComplete", capture.onComplete);
  try {
    await capture.cdpSession.detach();
  } catch {
    // ignore
  }

  const runLabel = process.env.PERF_LABEL ?? "current";
  // Chrome DevTools accepts both `{traceEvents: [...]}` and a bare array.
  // Use the explicit object form so the file extension `.trace.json` is
  // immediately recognized.
  const traceJson = JSON.stringify({ traceEvents: capture.events });
  await testInfo.attach(`perf-${scenarioName}.trace.json`, {
    body: traceJson,
    contentType: "application/json",
  });
  const labelDirPath = resolve(PACKAGE_PERF_DIR, runLabel);
  await mkdir(labelDirPath, { recursive: true });
  await writeFile(resolve(labelDirPath, `${scenarioName}.trace.json`), traceJson);
};

export const attachPerfReport = async (
  testInfo: TestInfo,
  scenarioName: string,
  aggregate: PerfScenarioAggregate,
  perSample: PerfScenarioAggregate[] = [aggregate],
  baseline: PerfScenarioAggregate | null = null,
): Promise<void> => {
  const runLabel = process.env.PERF_LABEL ?? "current";
  const reportJson = JSON.stringify(
    {
      scenario: scenarioName,
      label: runLabel,
      samples: perSample.length,
      aggregate,
      perSample,
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
  };
};

// Wraps a scenario body with: CDP trace start (if PERF_TRACE=1) →
// PerformanceObserver start → scenario body → stop everything → attach
// report. Runs the body `samples` times (default 3, js-framework-benchmark
// style) and returns the per-metric median, so single-run noise can't
// trip soft assertions.
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
  baseline?: PerfScenarioAggregate | null;
  /**
   * Runs OUTSIDE the recorded window before each sample. Use this for
   * per-sample setup that should not be measured — e.g. re-activating
   * react-grab for scenarios whose body deactivates as part of the
   * measured work, so sample 2..N don't start with no active selection
   * and silently measure no-op iterations.
   */
  beforeEachSample?: () => Promise<void>;
}

export const recordScenario = async (
  page: Page,
  testInfo: TestInfo,
  scenarioName: string,
  scenarioBody: () => Promise<void>,
  options: RecordScenarioOptions = {},
): Promise<PerfScenarioAggregate> => {
  const sampleCount = Math.max(1, options.samples ?? 3);
  // Auto-load the committed baseline if the caller didn't pass one in
  // explicitly. The artifact JSON always carries the baseline reference
  // so diffs are doable straight from the file.
  const baseline =
    options.baseline === undefined ? await loadCommittedBaseline(scenarioName) : options.baseline;
  const perSampleAggregates: PerfScenarioAggregate[] = [];
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    if (options.beforeEachSample) await options.beforeEachSample();
    // CDP traces are 5-100MB each; capturing only the first sample keeps
    // disk usage sane while still giving you something to drop into DevTools.
    const cdpTrace = sampleIndex === 0 ? await startCdpTrace(page) : null;
    await startRecording(page);
    // try/finally so the observer disconnects and CDP trace flushes even
    // if the scenario body throws mid-measurement.
    let rawSnapshot: PerfRawSnapshot | null = null;
    try {
      await scenarioBody();
    } finally {
      rawSnapshot = await stopRecording(page);
      await stopCdpTrace(testInfo, scenarioName, cdpTrace);
    }
    perSampleAggregates.push(aggregateRawSnapshot(rawSnapshot));
  }
  const medianAggregate =
    perSampleAggregates.length === 1
      ? perSampleAggregates[0]
      : medianAcrossSamples(perSampleAggregates);
  await attachPerfReport(testInfo, scenarioName, medianAggregate, perSampleAggregates, baseline);
  logAggregate(scenarioName, medianAggregate);
  return medianAggregate;
};

const logAggregate = (scenarioName: string, aggregate: PerfScenarioAggregate): void => {
  // eslint-disable-next-line no-console
  console.log(
    `\n[perf] ${scenarioName}\n` +
      `  inp=${aggregate.inp}ms (${aggregate.interactions} interactions)  ` +
      `longTasks=${aggregate.longTasks.count}/${aggregate.longTasks.sum}ms (max ${aggregate.longTasks.max}ms)\n` +
      `  loaf=${aggregate.longAnimationFrames.count}/${aggregate.longAnimationFrames.sum}ms ` +
      `(max ${aggregate.longAnimationFrames.max}ms, blocking ${aggregate.longAnimationFrames.maxBlocking}ms)\n` +
      `  frames p50=${aggregate.frames.median}ms p95=${aggregate.frames.p95}ms max=${aggregate.frames.max}ms (${aggregate.frames.count} frames)`,
  );
};
