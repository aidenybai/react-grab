import type { Fiber } from "bippy";
import {
  LONG_ANIMATION_FRAME_ENTRY_TYPE,
  MAX_SCAN_TRACE_COMMITS,
  MAX_SCAN_TRACE_FIBERS_PER_COMMIT,
  MAX_SCAN_TRACE_LOAF_ENTRIES,
  MAX_SCAN_TRACE_LOAF_SCRIPTS,
} from "../constants.js";
import type {
  ScanCommit,
  ScanLoafScript,
  ScanLongAnimationFrame,
  ScanRenderedFiber,
  ScanTrace,
} from "../types.js";
import { getChangeDescription } from "../utils/get-change-description.js";
import { getFiberSource } from "../utils/get-fiber-source.js";

// The `long-animation-frame` entry shape is not yet in the DOM lib types, so
// we model the fields we read off PerformanceObserver entries here.
interface LongAnimationFrameScriptTiming {
  sourceURL?: string;
  sourceFunctionName?: string;
  sourceCharPosition?: number;
  duration?: number;
  forcedStyleAndLayoutDuration?: number;
}

interface LongAnimationFrameTiming extends PerformanceEntry {
  renderStart?: number;
  blockingDuration?: number;
  firstUIEventTimestamp?: number;
  scripts?: LongAnimationFrameScriptTiming[];
}

interface CollectedFiber {
  fiber: Fiber;
  name: string;
  actualDurationMs: number;
  selfDurationMs: number;
  parentRendered: boolean;
}

export interface ScanTraceRecorder {
  begin: () => void;
  end: () => void;
  beginCommit: (timestamp: number) => void;
  collectFiber: (fiber: Fiber, name: string, parentRendered: boolean) => void;
  endCommit: () => void;
  takeTrace: () => ScanTrace | null;
}

const isLongAnimationFrameSupported = (): boolean =>
  typeof PerformanceObserver !== "undefined" &&
  Boolean(PerformanceObserver.supportedEntryTypes?.includes(LONG_ANIMATION_FRAME_ENTRY_TYPE));

// Records what react-scan/lite records - per commit, the fibers that rendered
// with their actualDuration, why they re-rendered (change description) and
// where they live (source) - plus the long-animation-frames over the same
// window, so an agent can attribute a slow frame to a commit and a component.
export const createScanTraceRecorder = (): ScanTraceRecorder => {
  const commits: ScanCommit[] = [];
  const longAnimationFrames: ScanLongAnimationFrame[] = [];
  const collected: CollectedFiber[] = [];
  let commitCount = 0;
  let currentCommitTimestamp = 0;
  let scanStartTimestamp = 0;
  let scanStartEpochMs = 0;
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
          sourceURL: script.sourceURL ?? "",
          sourceFunctionName: script.sourceFunctionName ?? "",
          sourceCharPosition: script.sourceCharPosition ?? 0,
          durationMs: script.duration ?? 0,
          forcedStyleAndLayoutDurationMs: script.forcedStyleAndLayoutDuration ?? 0,
        }));
      longAnimationFrames.push({
        startTimeMs: loafEntry.startTime,
        durationMs: loafEntry.duration,
        blockingDurationMs: loafEntry.blockingDuration ?? 0,
        renderStartMs: loafEntry.renderStart ?? 0,
        firstUIEventTimestampMs: loafEntry.firstUIEventTimestamp ?? 0,
        scripts,
      });
    }
  };

  const begin = (): void => {
    commits.length = 0;
    longAnimationFrames.length = 0;
    collected.length = 0;
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
    collected.length = 0;
  };

  const collectFiber = (fiber: Fiber, name: string, parentRendered: boolean): void => {
    collected.push({
      fiber,
      name,
      actualDurationMs: fiber.actualDuration ?? 0,
      selfDurationMs: fiber.selfBaseDuration ?? 0,
      parentRendered,
    });
  };

  // Finalizes the in-progress commit: keep the slowest fibers, and only for
  // those compute the (relatively expensive) change description + source while
  // the fibers are still the live alternates for this commit.
  const endCommit = (): void => {
    if (collected.length === 0) return;
    collected.sort((first, second) => second.actualDurationMs - first.actualDurationMs);

    let totalActualDurationMs = 0;
    for (const entry of collected) {
      if (entry.actualDurationMs > totalActualDurationMs) {
        totalActualDurationMs = entry.actualDurationMs;
      }
    }

    const fibers: ScanRenderedFiber[] = collected
      .slice(0, MAX_SCAN_TRACE_FIBERS_PER_COMMIT)
      .map((entry) => ({
        name: entry.name,
        actualDurationMs: entry.actualDurationMs,
        selfDurationMs: entry.selfDurationMs,
        source: getFiberSource(entry.fiber),
        change: getChangeDescription(entry.fiber, entry.parentRendered),
      }));

    commits.push({
      timestampMs: currentCommitTimestamp,
      totalActualDurationMs,
      renderedFiberCount: collected.length,
      fibers,
    });
    if (commits.length > MAX_SCAN_TRACE_COMMITS) commits.shift();
    collected.length = 0;
  };

  const takeTrace = (): ScanTrace | null => {
    if (commits.length === 0 && longAnimationFrames.length === 0) return null;
    return {
      startedAtEpochMs: scanStartEpochMs,
      durationMs: performance.now() - scanStartTimestamp,
      commitCount,
      commits: commits.slice(),
      longAnimationFrames: longAnimationFrames.slice(),
    };
  };

  return { begin, end, beginCommit, collectFiber, endCommit, takeTrace };
};
