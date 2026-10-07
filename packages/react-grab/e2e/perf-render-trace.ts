import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import type { CDPSession, Page, TestInfo } from "@playwright/test";
import {
  startCompositingProbe,
  type PerfCompositingProbe,
  type PerfCompositingSummary,
} from "./perf-compositing.js";
import {
  PERF_ANIMATION_INVENTORY_LIMIT,
  PERF_ANIMATION_LIFECYCLE_SAMPLE_INTERVAL_MS,
  PERF_CSS_RULE_TEXT_LIMIT,
  PERF_PERCENT_SCALE,
  PERF_RENDER_TRACE_CATEGORIES,
  PERF_TRACE_DEADLINE_MS,
  PERF_TRACE_BUFFER_SIZE_KB,
  PERF_TRACE_EVENT_LIMIT,
  PERF_TRACE_MARKER_END,
  PERF_TRACE_MARKER_START,
} from "./perf-constants.js";
import {
  summarizeRenderTrace,
  type PerfRenderPipelineSummary,
  type PerfTraceFile,
} from "./perf-render-trace-summary.js";
import { roundTo3 } from "./perf-statistics.js";
import {
  startPerfRunValidityProbe,
  type PerfRunValidityProbe,
  type PerfRunValiditySummary,
} from "./perf-validity.js";

export {
  summarizeRenderTrace,
  type PerfAdvancedPaintSummary,
  type PerfAnimationSchedulingSummary,
  type PerfPaintDisplayItemSummary,
  type PerfRenderPipelineSummary,
  type PerfSelectorStatsSummary,
  type PerfSelectorTimingSummary,
  type PerfTraceEvent,
  type PerfTraceFile,
  type PerfTraceFrameSummary,
  type PerfTraceStageSummary,
  type PerfTraceTopEvent,
} from "./perf-render-trace-summary.js";

export interface PerfAnimationLifecycleRecord {
  id: string;
  name: string;
  type: string;
  startedAtMs: number;
  finishedAtMs?: number;
  canceledAtMs?: number;
  durationMs?: number;
  iterations?: number;
  playStateAtEnd: string;
}

export interface PerfAnimationLifecycleSummary {
  activeAtStart: number;
  activeAtEnd: number;
  startedDuringScenario: number;
  finishedDuringScenario: number;
  canceledDuringScenario: number;
  activeAnimationMilliseconds: number;
  activeTimelineMilliseconds: number;
  zeroActiveAnimationMilliseconds: number;
  longestActiveTimelineMilliseconds: number;
  longestZeroAnimationIntervalMilliseconds: number;
  activeTimelineDutyCyclePercent: number;
  preventedTimelineIdle: boolean;
  records: PerfAnimationLifecycleRecord[];
}

export interface PerfCssRuleUsageEntry {
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface PerfCssStylesheetUsage {
  styleSheetId: string;
  sourceUrl: string;
  origin: string;
  length: number;
  usedRuleCount: number;
  usedRules: PerfCssRuleUsageEntry[];
}

export interface PerfProtocolAnimation {
  id: string;
  name: string;
  type: string;
  pausedState: boolean;
  playState: string;
  playbackRate: number;
  startTime: number;
  currentTime: number;
  source?: PerfProtocolAnimationSource;
  viewOrScrollTimeline?: unknown;
}

export interface PerfProtocolAnimationSource {
  backendNodeId?: number;
  delay?: number;
  duration?: number;
  endDelay?: number;
  iterations?: number;
  direction?: string;
  fill?: string;
  easing?: string;
}

export interface PerfCssTraceSummary {
  stylesheetCount: number;
  usedStylesheetCount: number;
  usedRuleCount: number;
  stylesheets: PerfCssStylesheetUsage[];
  animationsStarted: PerfProtocolAnimation[];
  animationCanceledIds: string[];
}

export interface PerfRenderTraceReport {
  available: boolean;
  pipeline?: PerfRenderPipelineSummary;
  css?: PerfCssTraceSummary;
  compositing?: PerfCompositingSummary;
  animationLifecycle?: PerfAnimationLifecycleSummary;
  validity?: PerfRunValiditySummary;
  artifact?: string;
  warnings: string[];
  error?: string;
}

interface TraceStreamResponse {
  data: string;
  eof?: boolean;
  base64Encoded?: boolean;
}

interface TraceCompleteEvent {
  stream?: string;
}

interface CssStyleSheetHeader {
  styleSheetId: string;
  sourceURL: string;
  origin: string;
  length: number;
}

interface CssStyleSheetAddedEvent {
  header: CssStyleSheetHeader;
}

interface CssRuleUsage {
  styleSheetId: string;
  startOffset: number;
  endOffset: number;
  used: boolean;
}

interface CssRuleUsageResponse {
  ruleUsage: CssRuleUsage[];
}

interface CssTextResponse {
  text: string;
}

interface AnimationStartedEvent {
  animation: PerfProtocolAnimation;
}

interface AnimationCanceledEvent {
  id: string;
}

interface AnimationUpdatedEvent {
  animation: PerfProtocolAnimation;
}

interface MutableAnimationLifecycleRecord {
  animation: PerfProtocolAnimation;
  startedAtMs: number;
  finishedAtMs?: number;
  canceledAtMs?: number;
}

interface AnimationCurrentTimeResponse {
  currentTime: number;
}

interface ActivePageAnimationSample {
  activeAnimationCount: number;
  timelineTimeMs: number | null;
}

interface AnimationLifecycleTracker {
  handleStarted(animation: PerfProtocolAnimation): void;
  handleUpdated(animation: PerfProtocolAnimation): void;
  handleCanceled(animationId: string): void;
  handleCurrentTime(animationId: string, currentTime: number): void;
  handleActiveAnimationSample(sample: ActivePageAnimationSample): void;
  getActiveAnimationIds(): string[];
  start(): void;
  stop(): PerfAnimationLifecycleSummary;
}

interface PerfViewportSize {
  width: number;
  height: number;
}

const getExpectedAnimationEndTime = (animation: PerfProtocolAnimation): number | undefined => {
  const iterations = animation.source?.iterations;
  if (iterations === undefined) return undefined;
  return (
    (animation.source?.delay ?? 0) +
    (animation.source?.duration ?? 0) * iterations +
    (animation.source?.endDelay ?? 0)
  );
};

const createAnimationLifecycleTracker = (): AnimationLifecycleTracker => {
  const activeAnimationIds = new Set<string>();
  const recordsById = new Map<string, MutableAnimationLifecycleRecord>();
  let isTrackingScenario = false;
  let scenarioStartedAtMs = 0;
  let lastStateChangeAtMs = 0;
  let currentActiveCount = 0;
  let untrackedActiveCount = 0;
  let lastSampleTimelineTimeMs: number | null = null;
  let activeAtStart = 0;
  let activeAnimationMilliseconds = 0;
  let activeTimelineMilliseconds = 0;
  let zeroActiveAnimationMilliseconds = 0;
  let currentIntervalMilliseconds = 0;
  let longestActiveTimelineMilliseconds = 0;
  let longestZeroAnimationIntervalMilliseconds = 0;
  let startedDuringScenario = 0;
  let finishedDuringScenario = 0;
  let canceledDuringScenario = 0;

  const updateIntegratedTime = (timestampMs: number): void => {
    if (!isTrackingScenario) return;
    const elapsedMilliseconds = Math.max(timestampMs - lastStateChangeAtMs, 0);
    activeAnimationMilliseconds += currentActiveCount * elapsedMilliseconds;
    currentIntervalMilliseconds += elapsedMilliseconds;
    if (currentActiveCount > 0) {
      activeTimelineMilliseconds += elapsedMilliseconds;
      longestActiveTimelineMilliseconds = Math.max(
        longestActiveTimelineMilliseconds,
        currentIntervalMilliseconds,
      );
    } else {
      zeroActiveAnimationMilliseconds += elapsedMilliseconds;
      longestZeroAnimationIntervalMilliseconds = Math.max(
        longestZeroAnimationIntervalMilliseconds,
        currentIntervalMilliseconds,
      );
    }
    lastStateChangeAtMs = timestampMs;
  };

  const updateCurrentActiveCount = (activeAnimationCount: number, timestampMs: number): void => {
    if (currentActiveCount === activeAnimationCount) return;
    const hadActiveTimeline = currentActiveCount > 0;
    updateIntegratedTime(timestampMs);
    currentActiveCount = activeAnimationCount;
    if (hadActiveTimeline !== currentActiveCount > 0) currentIntervalMilliseconds = 0;
  };

  const updateActiveState = (
    animation: PerfProtocolAnimation,
    timestampMs: number,
    wasPreviouslyTracked: boolean,
  ): void => {
    const wasActive = activeAnimationIds.has(animation.id);
    const isActive = animation.playState === "running" && !animation.pausedState;
    if (wasActive === isActive) return;
    if (isActive) {
      activeAnimationIds.add(animation.id);
      const wasIncludedInLatestPageSample =
        !wasPreviouslyTracked &&
        lastSampleTimelineTimeMs !== null &&
        (animation.viewOrScrollTimeline !== undefined ||
          animation.startTime <= lastSampleTimelineTimeMs);
      if (wasIncludedInLatestPageSample) {
        untrackedActiveCount = Math.max(0, untrackedActiveCount - 1);
      }
    } else {
      activeAnimationIds.delete(animation.id);
    }
    updateCurrentActiveCount(activeAnimationIds.size + untrackedActiveCount, timestampMs);
  };

  const markFinished = (record: MutableAnimationLifecycleRecord, timestampMs: number): void => {
    if (record.finishedAtMs !== undefined) return;
    record.animation.playState = "finished";
    updateActiveState(record.animation, timestampMs, true);
    if (!isTrackingScenario) return;
    record.finishedAtMs = timestampMs - scenarioStartedAtMs;
    finishedDuringScenario += 1;
  };

  return {
    handleStarted(animation) {
      const timestampMs = performance.now();
      const wasPreviouslyTracked = recordsById.has(animation.id);
      recordsById.set(animation.id, {
        animation,
        startedAtMs: isTrackingScenario ? timestampMs - scenarioStartedAtMs : 0,
      });
      updateActiveState(animation, timestampMs, wasPreviouslyTracked);
      if (isTrackingScenario) startedDuringScenario += 1;
    },
    handleUpdated(animation) {
      const timestampMs = performance.now();
      const record = recordsById.get(animation.id);
      if (record) record.animation = animation;
      else {
        recordsById.set(animation.id, {
          animation,
          startedAtMs: isTrackingScenario ? timestampMs - scenarioStartedAtMs : 0,
        });
      }
      updateActiveState(animation, timestampMs, Boolean(record));
      const lifecycleRecord = recordsById.get(animation.id);
      if (animation.playState === "finished" && lifecycleRecord) {
        markFinished(lifecycleRecord, timestampMs);
      }
    },
    handleCanceled(animationId) {
      const timestampMs = performance.now();
      if (activeAnimationIds.has(animationId)) {
        activeAnimationIds.delete(animationId);
        updateCurrentActiveCount(activeAnimationIds.size + untrackedActiveCount, timestampMs);
      }
      const record = recordsById.get(animationId);
      const expectedEndTime = record ? getExpectedAnimationEndTime(record.animation) : undefined;
      if (
        record &&
        expectedEndTime !== undefined &&
        record.animation.currentTime >= expectedEndTime
      ) {
        markFinished(record, timestampMs);
        return;
      }
      if (record && isTrackingScenario && record.finishedAtMs === undefined) {
        record.canceledAtMs = timestampMs - scenarioStartedAtMs;
        canceledDuringScenario += 1;
      }
    },
    handleCurrentTime(animationId, currentTime) {
      const record = recordsById.get(animationId);
      if (!record) return;
      record.animation.currentTime = currentTime;
      const expectedEndTime = getExpectedAnimationEndTime(record.animation);
      if (expectedEndTime === undefined) return;
      if (currentTime >= expectedEndTime) markFinished(record, performance.now());
    },
    handleActiveAnimationSample(sample) {
      const normalizedActiveAnimationCount = Math.max(0, sample.activeAnimationCount);
      untrackedActiveCount = Math.max(0, normalizedActiveAnimationCount - activeAnimationIds.size);
      lastSampleTimelineTimeMs = sample.timelineTimeMs;
      updateCurrentActiveCount(normalizedActiveAnimationCount, performance.now());
    },
    getActiveAnimationIds() {
      return [...activeAnimationIds];
    },
    start() {
      scenarioStartedAtMs = performance.now();
      lastStateChangeAtMs = scenarioStartedAtMs;
      activeAtStart = currentActiveCount;
      currentIntervalMilliseconds = 0;
      isTrackingScenario = true;
    },
    stop() {
      const scenarioEndedAtMs = performance.now();
      updateIntegratedTime(scenarioEndedAtMs);
      isTrackingScenario = false;
      const scenarioDurationMilliseconds = Math.max(scenarioEndedAtMs - scenarioStartedAtMs, 1);
      return {
        activeAtStart,
        activeAtEnd: currentActiveCount,
        startedDuringScenario,
        finishedDuringScenario,
        canceledDuringScenario,
        activeAnimationMilliseconds: roundTo3(activeAnimationMilliseconds),
        activeTimelineMilliseconds: roundTo3(activeTimelineMilliseconds),
        zeroActiveAnimationMilliseconds: roundTo3(zeroActiveAnimationMilliseconds),
        longestActiveTimelineMilliseconds: roundTo3(longestActiveTimelineMilliseconds),
        longestZeroAnimationIntervalMilliseconds: roundTo3(
          longestZeroAnimationIntervalMilliseconds,
        ),
        activeTimelineDutyCyclePercent: roundTo3(
          (activeTimelineMilliseconds / scenarioDurationMilliseconds) * PERF_PERCENT_SCALE,
        ),
        preventedTimelineIdle:
          activeAtStart > 0 && currentActiveCount > 0 && zeroActiveAnimationMilliseconds === 0,
        records: [...recordsById.values()]
          .slice(0, PERF_ANIMATION_INVENTORY_LIMIT)
          .map((record) => ({
            id: record.animation.id,
            name: record.animation.name,
            type: record.animation.type,
            startedAtMs: roundTo3(record.startedAtMs),
            finishedAtMs:
              record.finishedAtMs === undefined ? undefined : roundTo3(record.finishedAtMs),
            canceledAtMs:
              record.canceledAtMs === undefined ? undefined : roundTo3(record.canceledAtMs),
            durationMs: record.animation.source?.duration,
            iterations: record.animation.source?.iterations,
            playStateAtEnd: record.animation.playState,
          })),
      };
    },
  };
};

const closeTraceStream = async (browserSession: CDPSession, stream: string): Promise<void> => {
  await browserSession.send("IO.close", { handle: stream }).catch(() => {});
};

const readTraceStream = async (browserSession: CDPSession, stream: string): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  try {
    while (true) {
      const response: TraceStreamResponse = await browserSession.send("IO.read", {
        handle: stream,
      });
      chunks.push(Buffer.from(response.data, response.base64Encoded === true ? "base64" : "utf8"));
      if (response.eof) break;
    }
    return Buffer.concat(chunks);
  } finally {
    await closeTraceStream(browserSession, stream);
  }
};

const collectCssSummary = async (
  pageSession: CDPSession,
  stylesheetHeaders: Map<string, CssStyleSheetHeader>,
  ruleUsage: CssRuleUsage[],
  animationsStarted: PerfProtocolAnimation[],
  animationCanceledIds: string[],
): Promise<PerfCssTraceSummary> => {
  const usedRulesByStylesheet = new Map<string, CssRuleUsage[]>();
  for (const usage of ruleUsage) {
    if (!usage.used) continue;
    const stylesheetRules = usedRulesByStylesheet.get(usage.styleSheetId) ?? [];
    stylesheetRules.push(usage);
    usedRulesByStylesheet.set(usage.styleSheetId, stylesheetRules);
  }

  const stylesheets: PerfCssStylesheetUsage[] = [];
  for (const [styleSheetId, usedRules] of usedRulesByStylesheet) {
    const header = stylesheetHeaders.get(styleSheetId);
    let stylesheetText = "";
    try {
      const response: CssTextResponse = await pageSession.send("CSS.getStyleSheetText", {
        styleSheetId,
      });
      stylesheetText = response.text;
    } catch {
      stylesheetText = "";
    }
    stylesheets.push({
      styleSheetId,
      sourceUrl: header?.sourceURL ?? "",
      origin: header?.origin ?? "unknown",
      length: header?.length ?? stylesheetText.length,
      usedRuleCount: usedRules.length,
      usedRules: usedRules.slice(0, PERF_TRACE_EVENT_LIMIT).map((usage) => ({
        startOffset: usage.startOffset,
        endOffset: usage.endOffset,
        text: stylesheetText
          .slice(usage.startOffset, usage.endOffset)
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, PERF_CSS_RULE_TEXT_LIMIT),
      })),
    });
  }
  stylesheets.sort(
    (leftStylesheet, rightStylesheet) =>
      rightStylesheet.usedRuleCount - leftStylesheet.usedRuleCount,
  );
  return {
    stylesheetCount: stylesheetHeaders.size,
    usedStylesheetCount: stylesheets.length,
    usedRuleCount: stylesheets.reduce(
      (totalRuleCount, stylesheet) => totalRuleCount + stylesheet.usedRuleCount,
      0,
    ),
    stylesheets,
    animationsStarted,
    animationCanceledIds,
  };
};

const withDeadline = async <Result>(work: Promise<Result>): Promise<Result> => {
  let deadlineHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<Result>((_resolveDeadline, rejectDeadline) => {
        deadlineHandle = setTimeout(
          () => rejectDeadline(new Error(`Render trace exceeded ${PERF_TRACE_DEADLINE_MS}ms`)),
          PERF_TRACE_DEADLINE_MS,
        );
      }),
    ]);
  } finally {
    if (deadlineHandle) clearTimeout(deadlineHandle);
  }
};

const readActivePageAnimationSample = async (page: Page): Promise<ActivePageAnimationSample> =>
  page.evaluate(() => ({
    activeAnimationCount: document
      .getAnimations()
      .filter((animation) => animation.playState === "running").length,
    timelineTimeMs:
      typeof document.timeline.currentTime === "number" ? document.timeline.currentTime : null,
  }));

export const captureRenderTrace = async (
  page: Page,
  testInfo: TestInfo,
  scenarioName: string,
  packagePerfDirectory: string,
  scenarioBody: () => Promise<void>,
): Promise<PerfRenderTraceReport> => {
  const browser = page.context().browser();
  if (!browser) {
    return { available: false, warnings: [], error: "Browser is disconnected" };
  }

  let browserSession: CDPSession | null = null;
  let pageSession: CDPSession | null = null;
  let compositingProbe: PerfCompositingProbe | null = null;
  let validityProbe: PerfRunValidityProbe | null = null;
  let animationLifecycleInterval: ReturnType<typeof setInterval> | null = null;
  let isAnimationLifecycleSamplingActive = false;
  let pendingAnimationLifecycleSample = Promise.resolve();
  let animationLifecycleSamplingError: string | undefined;
  let isTracingActive = false;
  let traceStreamHandle: string | null = null;
  let shouldDiscardTraceStream = false;
  let pipeline: PerfRenderPipelineSummary | undefined;
  let css: PerfCssTraceSummary | undefined;
  let compositing: PerfCompositingSummary | undefined;
  let animationLifecycle: PerfAnimationLifecycleSummary | undefined;
  let validity: PerfRunValiditySummary | undefined;
  let artifact: string | undefined;
  const warnings: string[] = [];
  try {
    browserSession = await browser.newBrowserCDPSession();
    pageSession = await page.context().newCDPSession(page);
    const stylesheetHeaders = new Map<string, CssStyleSheetHeader>();
    const animationsStarted: PerfProtocolAnimation[] = [];
    const animationCanceledIds: string[] = [];
    const animationLifecycleTracker = createAnimationLifecycleTracker();
    pageSession.on("CSS.styleSheetAdded", (event: CssStyleSheetAddedEvent) => {
      stylesheetHeaders.set(event.header.styleSheetId, event.header);
    });
    pageSession.on("Animation.animationStarted", (event: AnimationStartedEvent) => {
      animationsStarted.push(event.animation);
      animationLifecycleTracker.handleStarted(event.animation);
    });
    pageSession.on("Animation.animationUpdated", (event: AnimationUpdatedEvent) => {
      animationLifecycleTracker.handleUpdated(event.animation);
    });
    pageSession.on("Animation.animationCanceled", (event: AnimationCanceledEvent) => {
      animationCanceledIds.push(event.id);
      animationLifecycleTracker.handleCanceled(event.id);
    });

    await pageSession.send("DOM.enable");
    await pageSession.send("CSS.enable");
    await pageSession.send("Animation.enable");
    await pageSession.send("CSS.startRuleUsageTracking");
    const viewportSize =
      page.viewportSize() ??
      (await page.evaluate(
        (): PerfViewportSize => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      ));
    compositingProbe = await startCompositingProbe(
      pageSession,
      viewportSize.width,
      viewportSize.height,
    );
    validityProbe = await startPerfRunValidityProbe(page);

    const activeBrowserSession = browserSession;
    const traceComplete = new Promise<TraceCompleteEvent>((resolveComplete) => {
      activeBrowserSession.once("Tracing.tracingComplete", (event: TraceCompleteEvent) => {
        traceStreamHandle = event.stream ?? null;
        resolveComplete(event);
        if (shouldDiscardTraceStream && event.stream) {
          void closeTraceStream(activeBrowserSession, event.stream);
        }
      });
    });
    await browserSession.send("Tracing.start", {
      transferMode: "ReturnAsStream",
      traceConfig: {
        recordMode: "recordUntilFull",
        traceBufferSizeInKb: PERF_TRACE_BUFFER_SIZE_KB,
        includedCategories: PERF_RENDER_TRACE_CATEGORIES,
      },
    });
    isTracingActive = true;

    const animationPageSession = pageSession;
    const sampleAnimationLifecycle = async (): Promise<void> => {
      try {
        animationLifecycleTracker.handleActiveAnimationSample(
          await readActivePageAnimationSample(page),
        );
        for (const animationId of animationLifecycleTracker.getActiveAnimationIds()) {
          try {
            const response: AnimationCurrentTimeResponse = await animationPageSession.send(
              "Animation.getCurrentTime",
              { id: animationId },
            );
            animationLifecycleTracker.handleCurrentTime(animationId, response.currentTime);
          } catch {
            // The animation can disappear between the event and the sample.
          }
        }
      } catch (samplingError) {
        if (!animationLifecycleSamplingError) {
          animationLifecycleSamplingError =
            samplingError instanceof Error ? samplingError.message : String(samplingError);
        }
      }
    };
    await sampleAnimationLifecycle();
    animationLifecycleTracker.start();
    isAnimationLifecycleSamplingActive = true;
    animationLifecycleInterval = setInterval(() => {
      if (!isAnimationLifecycleSamplingActive) return;
      pendingAnimationLifecycleSample =
        pendingAnimationLifecycleSample.then(sampleAnimationLifecycle);
    }, PERF_ANIMATION_LIFECYCLE_SAMPLE_INTERVAL_MS);
    await page.evaluate((markerName) => performance.mark(markerName), PERF_TRACE_MARKER_START);
    await scenarioBody();
    await page.evaluate((markerName) => performance.mark(markerName), PERF_TRACE_MARKER_END);
    isAnimationLifecycleSamplingActive = false;
    clearInterval(animationLifecycleInterval);
    animationLifecycleInterval = null;
    await pendingAnimationLifecycleSample;
    await sampleAnimationLifecycle();
    animationLifecycle = animationLifecycleTracker.stop();
    validity = await validityProbe.stop();
    validityProbe = null;
    compositing = await compositingProbe.stop();
    compositingProbe = null;
    if (animationLifecycleSamplingError) {
      warnings.push(
        `Animation lifecycle sampling was incomplete: ${animationLifecycleSamplingError}`,
      );
    }
    const ruleUsageResponse: CssRuleUsageResponse = await pageSession.send(
      "CSS.stopRuleUsageTracking",
    );
    await browserSession.send("Tracing.end");
    isTracingActive = false;
    const completedTrace = await withDeadline(traceComplete);
    if (!completedTrace.stream) throw new Error("Tracing completed without a stream handle");
    traceStreamHandle = completedTrace.stream;
    const traceBuffer = await withDeadline(readTraceStream(browserSession, completedTrace.stream));
    traceStreamHandle = null;
    const traceFile: PerfTraceFile = JSON.parse(traceBuffer.toString("utf8"));
    pipeline = summarizeRenderTrace(traceFile);
    if (!pipeline.usedScenarioMarkers) {
      warnings.push("Trace markers were not found; the summary covers the entire capture window");
    }
    css = await collectCssSummary(
      pageSession,
      stylesheetHeaders,
      ruleUsageResponse.ruleUsage,
      animationsStarted,
      animationCanceledIds,
    );
    const runLabel = process.env.PERF_LABEL ?? "current";
    const labelDirectory = resolve(packagePerfDirectory, runLabel);
    await mkdir(labelDirectory, { recursive: true });
    const artifactName = `${scenarioName}.render-trace.json.gz`;
    const compressedTrace = gzipSync(traceBuffer);
    await writeFile(resolve(labelDirectory, artifactName), compressedTrace);
    artifact = artifactName;
    await testInfo.attach(`perf-${artifactName}`, {
      body: compressedTrace,
      contentType: "application/gzip",
    });
    return {
      available: true,
      pipeline,
      css,
      compositing,
      animationLifecycle,
      validity,
      artifact,
      warnings,
    };
  } catch (captureError) {
    return {
      available: false,
      pipeline,
      css,
      compositing,
      animationLifecycle,
      validity,
      artifact,
      warnings,
      error: captureError instanceof Error ? captureError.message : String(captureError),
    };
  } finally {
    shouldDiscardTraceStream = true;
    isAnimationLifecycleSamplingActive = false;
    if (animationLifecycleInterval) clearInterval(animationLifecycleInterval);
    await pendingAnimationLifecycleSample.catch(() => {});
    if (validityProbe) {
      try {
        await validityProbe.stop();
      } catch {
        // A failed trace can close the page before validity bookkeeping completes.
      }
    }
    if (compositingProbe) {
      try {
        await compositingProbe.stop();
      } catch {
        // The page can close while the best-effort layer summary is finalized.
      }
    }
    if (browserSession && isTracingActive) {
      try {
        await browserSession.send("Tracing.end");
        isTracingActive = false;
      } catch {
        // A disconnected browser cannot retain a trace session.
      }
    }
    if (browserSession && traceStreamHandle) {
      await closeTraceStream(browserSession, traceStreamHandle);
      traceStreamHandle = null;
    }
    if (pageSession) {
      try {
        await pageSession.detach();
      } catch {
        // The page can close while a best-effort trace is being finalized.
      }
    }
    if (browserSession) {
      try {
        await browserSession.detach();
      } catch {
        // The browser can close while a best-effort trace is being finalized.
      }
    }
  }
};
