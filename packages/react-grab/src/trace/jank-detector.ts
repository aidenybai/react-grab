import {
  EVENT_BUFFER_WINDOW_MS,
  JANK_FRAME_THRESHOLD_MS,
  LONG_TASK_THRESHOLD_MS,
  TARGET_FRAME_BUDGET_MS,
} from "./trace-constants.js";
import type { TraceEvent } from "./trace-types.js";

interface JankDetector {
  start: () => void;
  stop: () => void;
  getEventsWithin: (windowMs: number) => TraceEvent[];
  clear: () => void;
}

interface LongAnimationFrameScript {
  name?: string;
  sourceURL?: string;
  sourceFunctionName?: string;
  duration?: number;
}

interface LongAnimationFrameEntry extends PerformanceEntry {
  scripts?: LongAnimationFrameScript[];
}

const supportsObserverType = (type: string): boolean => {
  const supportedTypes = PerformanceObserver.supportedEntryTypes;
  return Array.isArray(supportedTypes) && supportedTypes.includes(type);
};

export const createJankDetector = (): JankDetector => {
  let events: TraceEvent[] = [];
  let rafId = 0;
  let lastFrameTimestamp = 0;
  let isRunning = false;
  const observers: PerformanceObserver[] = [];

  const pruneOldEvents = (now: number) => {
    const cutoff = now - EVENT_BUFFER_WINDOW_MS;
    if (events.length > 0 && events[0].timestamp < cutoff) {
      events = events.filter((event) => event.timestamp >= cutoff);
    }
  };

  const recordEvent = (event: TraceEvent) => {
    events.push(event);
    pruneOldEvents(event.timestamp);
  };

  const measureFrame = (frameTimestamp: number) => {
    if (lastFrameTimestamp !== 0) {
      const frameDelta = frameTimestamp - lastFrameTimestamp;
      if (frameDelta > JANK_FRAME_THRESHOLD_MS) {
        recordEvent({
          kind: "jank",
          timestamp: performance.now(),
          durationMs: frameDelta,
          droppedFrames: Math.round(frameDelta / TARGET_FRAME_BUDGET_MS) - 1,
        });
      }
    }
    lastFrameTimestamp = frameTimestamp;
    rafId = requestAnimationFrame(measureFrame);
  };

  const observeEntries = (
    type: string,
    toEvent: (entry: PerformanceEntry) => TraceEvent | null,
  ) => {
    if (!supportsObserverType(type)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const event = toEvent(entry);
        if (event) recordEvent(event);
      }
    });
    observer.observe({ type, buffered: false });
    observers.push(observer);
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    lastFrameTimestamp = 0;
    rafId = requestAnimationFrame(measureFrame);

    observeEntries("longtask", (entry) =>
      entry.duration >= LONG_TASK_THRESHOLD_MS
        ? { kind: "longtask", timestamp: performance.now(), durationMs: entry.duration }
        : null,
    );

    observeEntries("long-animation-frame", (entry) => {
      const loafEntry: LongAnimationFrameEntry = entry;
      const scripts = (loafEntry.scripts ?? []).map((script) => ({
        name: script.name ?? "(anonymous)",
        sourceUrl: script.sourceURL,
        sourceFunctionName: script.sourceFunctionName,
        durationMs: script.duration ?? 0,
      }));
      return {
        kind: "long-animation-frame",
        timestamp: performance.now(),
        durationMs: entry.duration,
        scripts,
      };
    });
  };

  const stop = () => {
    if (!isRunning) return;
    isRunning = false;
    cancelAnimationFrame(rafId);
    for (const observer of observers) observer.disconnect();
    observers.length = 0;
  };

  return {
    start,
    stop,
    getEventsWithin: (windowMs) => {
      const cutoff = performance.now() - windowMs;
      return events.filter((event) => event.timestamp >= cutoff);
    },
    clear: () => {
      events = [];
    },
  };
};
