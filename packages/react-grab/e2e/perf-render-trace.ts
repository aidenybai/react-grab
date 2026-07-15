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
  PERF_MICROSECONDS_PER_SECOND,
  PERF_PERCENT_SCALE,
  PERF_RENDER_TRACE_CATEGORIES,
  PERF_TRACE_DEADLINE_MS,
  PERF_TRACE_EVENT_LIMIT,
  PERF_TRACE_MARKER_END,
  PERF_TRACE_MARKER_START,
} from "./perf-constants.js";
import {
  startPerfRunValidityProbe,
  type PerfRunValidityProbe,
  type PerfRunValiditySummary,
} from "./perf-validity.js";

export interface PerfTraceEvent {
  cat?: string;
  name: string;
  ph?: string;
  pid?: number;
  tid?: number;
  ts?: number;
  dur?: number;
  args?: Record<string, unknown>;
}

export interface PerfTraceFile {
  traceEvents: PerfTraceEvent[];
}

export interface PerfTraceStageSummary {
  eventCount: number;
  totalDurationMs: number;
  maximumDurationMs: number;
}

export interface PerfTraceTopEvent {
  name: string;
  category: string;
  eventCount: number;
  totalDurationMs: number;
  maximumDurationMs: number;
}

export interface PerfTraceFrameSummary {
  beginFrames: number;
  submittedFrames: number;
  drawAndSwapFrames: number;
  presentedFrames: number;
  droppedFrames: number;
  skippedFrames: number;
  productionRateFps: number;
  productionDutyCyclePercent: number;
}

export interface PerfAnimationSchedulingSummary {
  animationTickCount: number;
  animationTicksPerSecond: number;
  animateLayersCount: number;
  needsTickAnimationsCount: number;
  drawFrameCount: number;
  drawsPerAnimationTick: number;
  drawEfficiencyPercent: number;
}

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

export interface PerfRenderPipelineSummary {
  windowDurationMs: number;
  usedScenarioMarkers: boolean;
  traceEventCount: number;
  style: PerfTraceStageSummary;
  layout: PerfTraceStageSummary;
  paint: PerfTraceStageSummary;
  raster: PerfTraceStageSummary;
  compositor: PerfTraceStageSummary;
  viz: PerfTraceStageSummary;
  gpuProcess: PerfTraceStageSummary;
  selectorEventCount: number;
  invalidationEventCount: number;
  frames: PerfTraceFrameSummary;
  animationScheduling: PerfAnimationSchedulingSummary;
  topEvents: PerfTraceTopEvent[];
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

interface AnimationLifecycleTracker {
  handleStarted(animation: PerfProtocolAnimation): void;
  handleUpdated(animation: PerfProtocolAnimation): void;
  handleCanceled(animationId: string): void;
  handleCurrentTime(animationId: string, currentTime: number): void;
  getActiveAnimationIds(): string[];
  start(): void;
  stop(): PerfAnimationLifecycleSummary;
}

interface MutableTraceStageSummary {
  eventCount: number;
  totalDurationMicroseconds: number;
  maximumDurationMicroseconds: number;
}

interface MutableTraceTopEvent {
  name: string;
  category: string;
  eventCount: number;
  totalDurationMicroseconds: number;
  maximumDurationMicroseconds: number;
}

interface PerfViewportSize {
  width: number;
  height: number;
}

const emptyStage = (): MutableTraceStageSummary => ({
  eventCount: 0,
  totalDurationMicroseconds: 0,
  maximumDurationMicroseconds: 0,
});

const roundTo3 = (value: number): number => Number(value.toFixed(3));

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

  const updateActiveState = (animation: PerfProtocolAnimation, timestampMs: number): void => {
    const wasActive = activeAnimationIds.has(animation.id);
    const isActive = animation.playState === "running" && !animation.pausedState;
    if (wasActive === isActive) return;
    const hadActiveTimeline = currentActiveCount > 0;
    updateIntegratedTime(timestampMs);
    if (isActive) activeAnimationIds.add(animation.id);
    else activeAnimationIds.delete(animation.id);
    currentActiveCount = activeAnimationIds.size;
    if (hadActiveTimeline !== currentActiveCount > 0) currentIntervalMilliseconds = 0;
  };

  const markFinished = (record: MutableAnimationLifecycleRecord, timestampMs: number): void => {
    if (record.finishedAtMs !== undefined) return;
    record.animation.playState = "finished";
    updateActiveState(record.animation, timestampMs);
    if (!isTrackingScenario) return;
    record.finishedAtMs = timestampMs - scenarioStartedAtMs;
    finishedDuringScenario += 1;
  };

  return {
    handleStarted(animation) {
      const timestampMs = performance.now();
      recordsById.set(animation.id, {
        animation,
        startedAtMs: isTrackingScenario ? timestampMs - scenarioStartedAtMs : 0,
      });
      updateActiveState(animation, timestampMs);
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
      updateActiveState(animation, timestampMs);
      const lifecycleRecord = recordsById.get(animation.id);
      if (animation.playState === "finished" && lifecycleRecord) {
        markFinished(lifecycleRecord, timestampMs);
      }
    },
    handleCanceled(animationId) {
      const timestampMs = performance.now();
      if (activeAnimationIds.has(animationId)) {
        const hadActiveTimeline = currentActiveCount > 0;
        updateIntegratedTime(timestampMs);
        activeAnimationIds.delete(animationId);
        currentActiveCount = activeAnimationIds.size;
        if (hadActiveTimeline !== currentActiveCount > 0) currentIntervalMilliseconds = 0;
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
    getActiveAnimationIds() {
      return [...activeAnimationIds];
    },
    start() {
      scenarioStartedAtMs = performance.now();
      lastStateChangeAtMs = scenarioStartedAtMs;
      currentActiveCount = activeAnimationIds.size;
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
        activeAtEnd: activeAnimationIds.size,
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
          activeAtStart > 0 && activeAnimationIds.size > 0 && zeroActiveAnimationMilliseconds === 0,
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

const finalizeStage = (stage: MutableTraceStageSummary): PerfTraceStageSummary => ({
  eventCount: stage.eventCount,
  totalDurationMs: roundTo3(stage.totalDurationMicroseconds / 1000),
  maximumDurationMs: roundTo3(stage.maximumDurationMicroseconds / 1000),
});

const addDuration = (stage: MutableTraceStageSummary, durationMicroseconds: number): void => {
  stage.eventCount += 1;
  stage.totalDurationMicroseconds += durationMicroseconds;
  stage.maximumDurationMicroseconds = Math.max(
    stage.maximumDurationMicroseconds,
    durationMicroseconds,
  );
};

const classifyTraceStage = (traceEvent: PerfTraceEvent): string | null => {
  const eventName = traceEvent.name;
  const category = traceEvent.cat ?? "";
  if (/UpdateLayoutTree|RecalculateStyle|StyleRecalc|ParseAuthorStyleSheet/i.test(eventName)) {
    return "style";
  }
  if (/^Layout$|LayoutTree|LocalFrameView::layout/i.test(eventName)) return "layout";
  if (/Paint|PrePaint|PaintArtifact/i.test(eventName)) return "paint";
  if (/Raster|TileTask|ImageDecodeTask/i.test(eventName)) return "raster";
  if (/\bviz\b/i.test(category) || /DrawAndSwap|SurfaceAggregator|Display::Draw/i.test(eventName)) {
    return "viz";
  }
  if (/\bgpu\b/i.test(category) || /Gpu|CommandBuffer|SkiaOutputSurface/i.test(eventName)) {
    return "gpuProcess";
  }
  if (
    /Composite|Compositor|BeginFrame|Commit|Activate|DrawFrame|SubmitCompositorFrame/i.test(
      eventName,
    ) ||
    /\bcc\b/i.test(category)
  ) {
    return "compositor";
  }
  return null;
};

export const summarizeRenderTrace = (traceFile: PerfTraceFile): PerfRenderPipelineSummary => {
  const allEvents = traceFile.traceEvents ?? [];
  const startMarker = allEvents.find((traceEvent) => traceEvent.name === PERF_TRACE_MARKER_START);
  const endMarker = [...allEvents]
    .reverse()
    .find((traceEvent) => traceEvent.name === PERF_TRACE_MARKER_END);
  const startTimestamp = startMarker?.ts;
  const endTimestamp = endMarker?.ts;
  const usedScenarioMarkers =
    startTimestamp !== undefined && endTimestamp !== undefined && endTimestamp >= startTimestamp;
  const events = usedScenarioMarkers
    ? allEvents.filter(
        (traceEvent) =>
          traceEvent.ts !== undefined &&
          traceEvent.ts >= startTimestamp &&
          traceEvent.ts <= endTimestamp,
      )
    : allEvents;

  const stages: Record<string, MutableTraceStageSummary> = {
    style: emptyStage(),
    layout: emptyStage(),
    paint: emptyStage(),
    raster: emptyStage(),
    compositor: emptyStage(),
    viz: emptyStage(),
    gpuProcess: emptyStage(),
  };
  const topEventsByKey = new Map<string, MutableTraceTopEvent>();
  let selectorEventCount = 0;
  let invalidationEventCount = 0;
  const frames: PerfTraceFrameSummary = {
    beginFrames: 0,
    submittedFrames: 0,
    drawAndSwapFrames: 0,
    presentedFrames: 0,
    droppedFrames: 0,
    skippedFrames: 0,
    productionRateFps: 0,
    productionDutyCyclePercent: 0,
  };
  const animationScheduling: PerfAnimationSchedulingSummary = {
    animationTickCount: 0,
    animationTicksPerSecond: 0,
    animateLayersCount: 0,
    needsTickAnimationsCount: 0,
    drawFrameCount: 0,
    drawsPerAnimationTick: 0,
    drawEfficiencyPercent: 0,
  };

  for (const traceEvent of events) {
    const durationMicroseconds = traceEvent.ph === "X" ? (traceEvent.dur ?? 0) : 0;
    const stageName = classifyTraceStage(traceEvent);
    if (stageName) addDuration(stages[stageName], durationMicroseconds);
    if (/Selector/i.test(traceEvent.name)) selectorEventCount += 1;
    if (/Invalidat/i.test(traceEvent.name)) invalidationEventCount += 1;
    if (traceEvent.name === "Scheduler::BeginFrame") frames.beginFrames += 1;
    if (traceEvent.name === "SubmitCompositorFrame") frames.submittedFrames += 1;
    if (traceEvent.name === "Display::DrawAndSwap") frames.drawAndSwapFrames += 1;
    if (traceEvent.name === "FramePresented") frames.presentedFrames += 1;
    if (
      traceEvent.name === "DroppedFrame" ||
      traceEvent.name === "Scheduler::MissedBeginFrameDropped"
    ) {
      frames.droppedFrames += 1;
    }
    if (traceEvent.name === "LayerTreeHostImpl::DidNotProduceFrame") frames.skippedFrames += 1;
    if (traceEvent.name === "AnimationHost::TickAnimations") {
      animationScheduling.animationTickCount += 1;
    }
    if (traceEvent.name === "LayerTreeHostImpl::AnimateLayers") {
      animationScheduling.animateLayersCount += 1;
    }
    if (traceEvent.name === "NeedsTickAnimations") {
      animationScheduling.needsTickAnimationsCount += 1;
    }
    if (traceEvent.name === "DrawFrame") animationScheduling.drawFrameCount += 1;
    if (durationMicroseconds <= 0) continue;
    const eventKey = `${traceEvent.name}\u0000${traceEvent.cat ?? ""}`;
    const existingTopEvent = topEventsByKey.get(eventKey);
    if (existingTopEvent) {
      existingTopEvent.eventCount += 1;
      existingTopEvent.totalDurationMicroseconds += durationMicroseconds;
      existingTopEvent.maximumDurationMicroseconds = Math.max(
        existingTopEvent.maximumDurationMicroseconds,
        durationMicroseconds,
      );
    } else {
      topEventsByKey.set(eventKey, {
        name: traceEvent.name,
        category: traceEvent.cat ?? "",
        eventCount: 1,
        totalDurationMicroseconds: durationMicroseconds,
        maximumDurationMicroseconds: durationMicroseconds,
      });
    }
  }

  const traceStart = events.reduce(
    (minimum, traceEvent) => Math.min(minimum, traceEvent.ts ?? minimum),
    Number.POSITIVE_INFINITY,
  );
  const traceEnd = events.reduce(
    (maximum, traceEvent) => Math.max(maximum, (traceEvent.ts ?? maximum) + (traceEvent.dur ?? 0)),
    Number.NEGATIVE_INFINITY,
  );
  const windowDurationMicroseconds = usedScenarioMarkers
    ? endTimestamp - startTimestamp
    : Number.isFinite(traceStart) && Number.isFinite(traceEnd)
      ? traceEnd - traceStart
      : 0;
  const productionOpportunityCount = frames.drawAndSwapFrames + frames.skippedFrames;
  frames.productionRateFps = roundTo3(
    (frames.drawAndSwapFrames * PERF_MICROSECONDS_PER_SECOND) /
      Math.max(windowDurationMicroseconds, 1),
  );
  frames.productionDutyCyclePercent = roundTo3(
    (frames.drawAndSwapFrames / Math.max(productionOpportunityCount, 1)) * PERF_PERCENT_SCALE,
  );
  animationScheduling.animationTicksPerSecond = roundTo3(
    (animationScheduling.animationTickCount * PERF_MICROSECONDS_PER_SECOND) /
      Math.max(windowDurationMicroseconds, 1),
  );
  animationScheduling.drawsPerAnimationTick = roundTo3(
    animationScheduling.drawFrameCount / Math.max(animationScheduling.animationTickCount, 1),
  );
  animationScheduling.drawEfficiencyPercent = roundTo3(
    animationScheduling.drawsPerAnimationTick * PERF_PERCENT_SCALE,
  );

  return {
    windowDurationMs: roundTo3(windowDurationMicroseconds / 1000),
    usedScenarioMarkers,
    traceEventCount: events.length,
    style: finalizeStage(stages.style),
    layout: finalizeStage(stages.layout),
    paint: finalizeStage(stages.paint),
    raster: finalizeStage(stages.raster),
    compositor: finalizeStage(stages.compositor),
    viz: finalizeStage(stages.viz),
    gpuProcess: finalizeStage(stages.gpuProcess),
    selectorEventCount,
    invalidationEventCount,
    frames,
    animationScheduling,
    topEvents: [...topEventsByKey.values()]
      .sort(
        (leftEvent, rightEvent) =>
          rightEvent.totalDurationMicroseconds - leftEvent.totalDurationMicroseconds,
      )
      .slice(0, PERF_TRACE_EVENT_LIMIT)
      .map((traceEvent) => ({
        name: traceEvent.name,
        category: traceEvent.category,
        eventCount: traceEvent.eventCount,
        totalDurationMs: roundTo3(traceEvent.totalDurationMicroseconds / 1000),
        maximumDurationMs: roundTo3(traceEvent.maximumDurationMicroseconds / 1000),
      })),
  };
};

const readTraceStream = async (browserSession: CDPSession, stream: string): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  while (true) {
    const response: TraceStreamResponse = await browserSession.send("IO.read", { handle: stream });
    chunks.push(Buffer.from(response.data, response.base64Encoded === true ? "base64" : "utf8"));
    if (response.eof) break;
  }
  await browserSession.send("IO.close", { handle: stream });
  return Buffer.concat(chunks);
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

    const traceComplete = new Promise<TraceCompleteEvent>((resolveComplete) => {
      browserSession?.once("Tracing.tracingComplete", resolveComplete);
    });
    await browserSession.send("Tracing.start", {
      transferMode: "ReturnAsStream",
      traceConfig: {
        recordMode: "recordUntilFull",
        includedCategories: PERF_RENDER_TRACE_CATEGORIES,
      },
    });

    animationLifecycleTracker.start();
    const animationPageSession = pageSession;
    let pendingAnimationLifecycleSample = Promise.resolve();
    const sampleAnimationLifecycle = async (): Promise<void> => {
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
    };
    animationLifecycleInterval = setInterval(() => {
      pendingAnimationLifecycleSample =
        pendingAnimationLifecycleSample.then(sampleAnimationLifecycle);
    }, PERF_ANIMATION_LIFECYCLE_SAMPLE_INTERVAL_MS);
    await page.evaluate((markerName) => performance.mark(markerName), PERF_TRACE_MARKER_START);
    await scenarioBody();
    await page.evaluate((markerName) => performance.mark(markerName), PERF_TRACE_MARKER_END);
    clearInterval(animationLifecycleInterval);
    animationLifecycleInterval = null;
    await pendingAnimationLifecycleSample;
    await sampleAnimationLifecycle();
    const animationLifecycle = animationLifecycleTracker.stop();
    const validity = await validityProbe.stop();
    validityProbe = null;
    const compositing = await compositingProbe.stop();
    compositingProbe = null;
    const ruleUsageResponse: CssRuleUsageResponse = await pageSession.send(
      "CSS.stopRuleUsageTracking",
    );
    await browserSession.send("Tracing.end");
    const completedTrace = await withDeadline(traceComplete);
    if (!completedTrace.stream) throw new Error("Tracing completed without a stream handle");
    const traceBuffer = await withDeadline(readTraceStream(browserSession, completedTrace.stream));
    const traceFile: PerfTraceFile = JSON.parse(traceBuffer.toString("utf8"));
    const pipeline = summarizeRenderTrace(traceFile);
    const css = await collectCssSummary(
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
    await testInfo.attach(`perf-${artifactName}`, {
      body: compressedTrace,
      contentType: "application/gzip",
    });
    const warnings = pipeline.usedScenarioMarkers
      ? []
      : ["Trace markers were not found; the summary covers the entire capture window"];
    return {
      available: true,
      pipeline,
      css,
      compositing,
      animationLifecycle,
      validity,
      artifact: artifactName,
      warnings,
    };
  } catch (captureError) {
    return {
      available: false,
      warnings: [],
      error: captureError instanceof Error ? captureError.message : String(captureError),
    };
  } finally {
    if (animationLifecycleInterval) clearInterval(animationLifecycleInterval);
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
