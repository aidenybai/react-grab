import type { Fiber } from "bippy";
import {
  LONG_ANIMATION_FRAME_ENTRY_TYPE,
  MAX_SCAN_TRACE_COMPONENTS,
  MAX_SCAN_TRACE_LOAF_ENTRIES,
  MAX_SCAN_TRACE_LOAF_SCRIPTS,
} from "../constants.js";
import type {
  ScanComponentProfile,
  ScanLoafScript,
  ScanLongAnimationFrame,
  ScanTrace,
} from "../types.js";

// The `long-animation-frame` entry shape is not yet in the DOM lib types, so
// we model the fields we read off PerformanceObserver entries here.
interface LongAnimationFrameScriptTiming {
  invoker?: string;
  invokerType?: string;
  sourceURL?: string;
  sourceFunctionName?: string;
  duration?: number;
  forcedStyleAndLayoutDuration?: number;
}

interface LongAnimationFrameTiming extends PerformanceEntry {
  renderStart?: number;
  styleAndLayoutStart?: number;
  blockingDuration?: number;
  scripts?: LongAnimationFrameScriptTiming[];
}

export interface ScanTraceRecorder {
  begin: () => void;
  end: () => void;
  beginCommit: (timestamp: number) => void;
  recordFiber: (componentName: string, fiber: Fiber) => void;
  takeTrace: () => ScanTrace | null;
}

const isLongAnimationFrameSupported = (): boolean =>
  typeof PerformanceObserver !== "undefined" &&
  Boolean(PerformanceObserver.supportedEntryTypes?.includes(LONG_ANIMATION_FRAME_ENTRY_TYPE));

// Pure, DOM-free profiling model: accumulates per-component render cost and
// long-animation-frame entries over a scan session. Kept separate from the
// canvas scanner so it can be reasoned about and tested on its own.
export const createScanTraceRecorder = (): ScanTraceRecorder => {
  const componentProfiles = new Map<string, ScanComponentProfile>();
  const longAnimationFrames: ScanLongAnimationFrame[] = [];
  let commitCount = 0;
  let scanStartTimestamp = 0;
  let scanStartEpochMs = 0;
  let currentCommitTimestamp = 0;
  let observer: PerformanceObserver | null = null;

  const recordLongAnimationFrames = (list: PerformanceObserverEntryList): void => {
    for (const entry of list.getEntries()) {
      if (longAnimationFrames.length >= MAX_SCAN_TRACE_LOAF_ENTRIES) break;
      // getEntries() is typed as the base PerformanceEntry; the runtime entry
      // carries the long-animation-frame fields modeled above.
      const loafEntry = entry as LongAnimationFrameTiming;
      const scripts: ScanLoafScript[] = (loafEntry.scripts ?? [])
        .slice(0, MAX_SCAN_TRACE_LOAF_SCRIPTS)
        .map((script) => ({
          invoker: script.invoker ?? "",
          invokerType: script.invokerType ?? "",
          sourceURL: script.sourceURL ?? "",
          sourceFunctionName: script.sourceFunctionName ?? "",
          durationMs: script.duration ?? 0,
          forcedStyleAndLayoutDurationMs: script.forcedStyleAndLayoutDuration ?? 0,
        }));
      longAnimationFrames.push({
        startTimeMs: loafEntry.startTime,
        durationMs: loafEntry.duration,
        blockingDurationMs: loafEntry.blockingDuration ?? 0,
        renderStartMs: loafEntry.renderStart ?? 0,
        styleAndLayoutStartMs: loafEntry.styleAndLayoutStart ?? 0,
        scripts,
      });
    }
  };

  const begin = (): void => {
    componentProfiles.clear();
    longAnimationFrames.length = 0;
    commitCount = 0;
    scanStartTimestamp = performance.now();
    scanStartEpochMs = Date.now();
    if (!isLongAnimationFrameSupported()) return;
    observer = new PerformanceObserver(recordLongAnimationFrames);
    try {
      observer.observe({ type: LONG_ANIMATION_FRAME_ENTRY_TYPE, buffered: false });
    } catch {
      observer = null;
    }
  };

  const end = (): void => {
    observer?.disconnect();
    observer = null;
  };

  const beginCommit = (timestamp: number): void => {
    currentCommitTimestamp = timestamp;
    commitCount += 1;
  };

  const recordFiber = (componentName: string, fiber: Fiber): void => {
    const actualDurationMs = fiber.actualDuration ?? 0;
    const selfDurationMs = fiber.selfBaseDuration ?? 0;
    const existingProfile = componentProfiles.get(componentName);
    if (existingProfile) {
      existingProfile.renderCount += 1;
      existingProfile.totalActualDurationMs += actualDurationMs;
      existingProfile.totalSelfDurationMs += selfDurationMs;
      if (actualDurationMs > existingProfile.maxActualDurationMs) {
        existingProfile.maxActualDurationMs = actualDurationMs;
      }
      existingProfile.lastRenderTimestamp = currentCommitTimestamp;
    } else {
      componentProfiles.set(componentName, {
        componentName,
        renderCount: 1,
        totalActualDurationMs: actualDurationMs,
        maxActualDurationMs: actualDurationMs,
        totalSelfDurationMs: selfDurationMs,
        lastRenderTimestamp: currentCommitTimestamp,
      });
    }
  };

  const takeTrace = (): ScanTrace | null => {
    if (componentProfiles.size === 0 && longAnimationFrames.length === 0) return null;
    const components = Array.from(componentProfiles.values())
      .sort(
        (first, second) =>
          second.totalActualDurationMs - first.totalActualDurationMs ||
          second.renderCount - first.renderCount,
      )
      .slice(0, MAX_SCAN_TRACE_COMPONENTS);
    return {
      startedAtEpochMs: scanStartEpochMs,
      durationMs: performance.now() - scanStartTimestamp,
      commitCount,
      components,
      longAnimationFrames: longAnimationFrames.slice(),
    };
  };

  return { begin, end, beginCommit, recordFiber, takeTrace };
};
