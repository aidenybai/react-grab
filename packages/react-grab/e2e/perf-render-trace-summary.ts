import {
  PERF_MICROSECONDS_PER_MILLISECOND,
  PERF_MICROSECONDS_PER_SECOND,
  PERF_PAINT_DISPLAY_ITEM_LIMIT,
  PERF_PERCENT_SCALE,
  PERF_SELECTOR_STATS_LIMIT,
  PERF_TRACE_EVENT_LIMIT,
  PERF_TRACE_MARKER_END,
  PERF_TRACE_MARKER_START,
} from "./perf-constants.js";
import { roundTo3 } from "./perf-statistics.js";

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

export interface PerfSelectorTimingSummary {
  selector: string;
  styleSheetId: string;
  elapsedMs: number;
  matchAttempts: number;
  matchCount: number;
  fastRejectCount: number;
  invalidationCount: number;
  slowPathNonMatchPercent: number;
}

export interface PerfSelectorStatsSummary {
  eventCount: number;
  selectorCount: number;
  totalElapsedMs: number;
  matchAttempts: number;
  matchCount: number;
  fastRejectCount: number;
  slowPathNonMatchPercent: number;
  topSelectors: PerfSelectorTimingSummary[];
}

export interface PerfPaintDisplayItemSummary {
  name: string;
  count: number;
  paintedVisualAreaPx: number;
}

export interface PerfAdvancedPaintSummary {
  pictureSnapshotCount: number;
  displayItemListSnapshotCount: number;
  displayItemCount: number;
  paintedVisualAreaPx: number;
  topDisplayItems: PerfPaintDisplayItemSummary[];
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
  selectorStats: PerfSelectorStatsSummary;
  advancedPaint: PerfAdvancedPaintSummary;
  frames: PerfTraceFrameSummary;
  animationScheduling: PerfAnimationSchedulingSummary;
  topEvents: PerfTraceTopEvent[];
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

interface MutableSelectorTimingSummary {
  selector: string;
  styleSheetId: string;
  elapsedMicroseconds: number;
  matchAttempts: number;
  matchCount: number;
  fastRejectCount: number;
  invalidationCount: number;
}

interface MutablePaintDisplayItemSummary {
  name: string;
  count: number;
  paintedVisualAreaPx: number;
}

const emptyStage = (): MutableTraceStageSummary => ({
  eventCount: 0,
  totalDurationMicroseconds: 0,
  maximumDurationMicroseconds: 0,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const readSelectorElapsedMicroseconds = (selectorTiming: Record<string, unknown>): number =>
  readNumber(selectorTiming, "elapsed (us)") || readNumber(selectorTiming, "elapsed");

const readString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  return typeof value === "string" ? value : "";
};

const getSelectorTimings = (traceEvent: PerfTraceEvent): Record<string, unknown>[] => {
  if (traceEvent.name !== "SelectorStats" || !isRecord(traceEvent.args)) return [];
  const selectorStats = traceEvent.args.selector_stats;
  if (!isRecord(selectorStats) || !Array.isArray(selectorStats.selector_timings)) return [];
  return selectorStats.selector_timings.filter(isRecord);
};

const getDisplayItems = (traceEvent: PerfTraceEvent): Record<string, unknown>[] => {
  if (traceEvent.name !== "cc::DisplayItemList" || !isRecord(traceEvent.args)) return [];
  const snapshot = traceEvent.args.snapshot;
  if (!isRecord(snapshot) || !isRecord(snapshot.params) || !Array.isArray(snapshot.params.items)) {
    return [];
  }
  return snapshot.params.items.filter(isRecord);
};

const hasTraceSnapshot = (traceEvent: PerfTraceEvent): boolean =>
  isRecord(traceEvent.args) && isRecord(traceEvent.args.snapshot);

const getVisualArea = (displayItem: Record<string, unknown>): number => {
  const visualRect = displayItem.visual_rect;
  if (!Array.isArray(visualRect)) return 0;
  const width = visualRect[2];
  const height = visualRect[3];
  if (typeof width !== "number" || typeof height !== "number") return 0;
  return Math.max(0, width) * Math.max(0, height);
};

const finalizeStage = (stage: MutableTraceStageSummary): PerfTraceStageSummary => ({
  eventCount: stage.eventCount,
  totalDurationMs: roundTo3(stage.totalDurationMicroseconds / PERF_MICROSECONDS_PER_MILLISECOND),
  maximumDurationMs: roundTo3(
    stage.maximumDurationMicroseconds / PERF_MICROSECONDS_PER_MILLISECOND,
  ),
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
  if (/BeginMainFrame/i.test(eventName)) return null;
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
  const selectorTimingsByKey = new Map<string, MutableSelectorTimingSummary>();
  const paintDisplayItemsByName = new Map<string, MutablePaintDisplayItemSummary>();
  let selectorEventCount = 0;
  let invalidationEventCount = 0;
  let selectorStatsEventCount = 0;
  let pictureSnapshotCount = 0;
  let displayItemListSnapshotCount = 0;
  let displayItemCount = 0;
  let paintedVisualAreaPx = 0;
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
    const selectorTimings = getSelectorTimings(traceEvent);
    if (selectorTimings.length > 0) selectorStatsEventCount += 1;
    for (const selectorTiming of selectorTimings) {
      const selector = readString(selectorTiming, "selector") || "(unknown selector)";
      const styleSheetId = readString(selectorTiming, "style_sheet_id");
      const selectorKey = `${selector}\u0000${styleSheetId}`;
      const existingSelectorTiming = selectorTimingsByKey.get(selectorKey);
      if (existingSelectorTiming) {
        existingSelectorTiming.elapsedMicroseconds +=
          readSelectorElapsedMicroseconds(selectorTiming);
        existingSelectorTiming.matchAttempts += readNumber(selectorTiming, "match_attempts");
        existingSelectorTiming.matchCount += readNumber(selectorTiming, "match_count");
        existingSelectorTiming.fastRejectCount += readNumber(selectorTiming, "fast_reject_count");
        existingSelectorTiming.invalidationCount += readNumber(
          selectorTiming,
          "invalidation_count",
        );
      } else {
        selectorTimingsByKey.set(selectorKey, {
          selector,
          styleSheetId,
          elapsedMicroseconds: readSelectorElapsedMicroseconds(selectorTiming),
          matchAttempts: readNumber(selectorTiming, "match_attempts"),
          matchCount: readNumber(selectorTiming, "match_count"),
          fastRejectCount: readNumber(selectorTiming, "fast_reject_count"),
          invalidationCount: readNumber(selectorTiming, "invalidation_count"),
        });
      }
    }
    if (traceEvent.name === "cc::Picture" && hasTraceSnapshot(traceEvent)) {
      pictureSnapshotCount += 1;
    }
    const displayItems = getDisplayItems(traceEvent);
    if (traceEvent.name === "cc::DisplayItemList" && hasTraceSnapshot(traceEvent)) {
      displayItemListSnapshotCount += 1;
    }
    for (const displayItem of displayItems) {
      const name = readString(displayItem, "name") || "(unknown display item)";
      const visualAreaPx = getVisualArea(displayItem);
      const existingDisplayItem = paintDisplayItemsByName.get(name);
      if (existingDisplayItem) {
        existingDisplayItem.count += 1;
        existingDisplayItem.paintedVisualAreaPx += visualAreaPx;
      } else {
        paintDisplayItemsByName.set(name, {
          name,
          count: 1,
          paintedVisualAreaPx: visualAreaPx,
        });
      }
      displayItemCount += 1;
      paintedVisualAreaPx += visualAreaPx;
    }
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
  const selectorTimingSummaries = [...selectorTimingsByKey.values()];
  const selectorMatchAttempts = selectorTimingSummaries.reduce(
    (total, selectorTiming) => total + selectorTiming.matchAttempts,
    0,
  );
  const selectorMatchCount = selectorTimingSummaries.reduce(
    (total, selectorTiming) => total + selectorTiming.matchCount,
    0,
  );
  const selectorFastRejectCount = selectorTimingSummaries.reduce(
    (total, selectorTiming) => total + selectorTiming.fastRejectCount,
    0,
  );
  const selectorNonMatchCount = Math.max(selectorMatchAttempts - selectorMatchCount, 0);
  const selectorSlowPathNonMatchCount = Math.max(
    selectorNonMatchCount - selectorFastRejectCount,
    0,
  );
  const toSelectorTimingSummary = (
    selectorTiming: MutableSelectorTimingSummary,
  ): PerfSelectorTimingSummary => {
    const nonMatchCount = Math.max(selectorTiming.matchAttempts - selectorTiming.matchCount, 0);
    return {
      selector: selectorTiming.selector,
      styleSheetId: selectorTiming.styleSheetId,
      elapsedMs: roundTo3(selectorTiming.elapsedMicroseconds / PERF_MICROSECONDS_PER_MILLISECOND),
      matchAttempts: selectorTiming.matchAttempts,
      matchCount: selectorTiming.matchCount,
      fastRejectCount: selectorTiming.fastRejectCount,
      invalidationCount: selectorTiming.invalidationCount,
      slowPathNonMatchPercent: roundTo3(
        (Math.max(nonMatchCount - selectorTiming.fastRejectCount, 0) / Math.max(nonMatchCount, 1)) *
          PERF_PERCENT_SCALE,
      ),
    };
  };

  return {
    windowDurationMs: roundTo3(windowDurationMicroseconds / PERF_MICROSECONDS_PER_MILLISECOND),
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
    selectorStats: {
      eventCount: selectorStatsEventCount,
      selectorCount: selectorTimingSummaries.length,
      totalElapsedMs: roundTo3(
        selectorTimingSummaries.reduce(
          (total, selectorTiming) => total + selectorTiming.elapsedMicroseconds,
          0,
        ) / PERF_MICROSECONDS_PER_MILLISECOND,
      ),
      matchAttempts: selectorMatchAttempts,
      matchCount: selectorMatchCount,
      fastRejectCount: selectorFastRejectCount,
      slowPathNonMatchPercent: roundTo3(
        (selectorSlowPathNonMatchCount / Math.max(selectorNonMatchCount, 1)) * PERF_PERCENT_SCALE,
      ),
      topSelectors: selectorTimingSummaries
        .sort(
          (leftSelector, rightSelector) =>
            rightSelector.elapsedMicroseconds - leftSelector.elapsedMicroseconds,
        )
        .slice(0, PERF_SELECTOR_STATS_LIMIT)
        .map(toSelectorTimingSummary),
    },
    advancedPaint: {
      pictureSnapshotCount,
      displayItemListSnapshotCount,
      displayItemCount,
      paintedVisualAreaPx: roundTo3(paintedVisualAreaPx),
      topDisplayItems: [...paintDisplayItemsByName.values()]
        .sort(
          (leftItem, rightItem) =>
            rightItem.paintedVisualAreaPx - leftItem.paintedVisualAreaPx ||
            rightItem.count - leftItem.count,
        )
        .slice(0, PERF_PAINT_DISPLAY_ITEM_LIMIT)
        .map((displayItem) => ({
          name: displayItem.name,
          count: displayItem.count,
          paintedVisualAreaPx: roundTo3(displayItem.paintedVisualAreaPx),
        })),
    },
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
        totalDurationMs: roundTo3(
          traceEvent.totalDurationMicroseconds / PERF_MICROSECONDS_PER_MILLISECOND,
        ),
        maximumDurationMs: roundTo3(
          traceEvent.maximumDurationMicroseconds / PERF_MICROSECONDS_PER_MILLISECOND,
        ),
      })),
  };
};
