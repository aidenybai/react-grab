interface BackgroundTaskScheduler {
  postTask: (
    callback: () => void,
    options: { priority: "background" },
  ) => unknown;
}

declare global {
  interface Window {
    scheduler?: BackgroundTaskScheduler;
  }
}

const isBackgroundTaskScheduler = (
  value: unknown,
): value is BackgroundTaskScheduler => {
  if (typeof value !== "object" || value === null) return false;
  if (!("postTask" in value)) return false;
  return typeof value.postTask === "function";
};

// Defers work via the best available idle-scheduling primitive: the Scheduler
// API with background priority (Chrome 94+), then requestIdleCallback, then a
// setTimeout(0) fallback. This is used for expensive hit-testing work that
// should never block user-visible rendering.
export const onIdle = (callback: () => void): void => {
  if (typeof window !== "undefined") {
    const schedulerCandidate = window.scheduler;
    if (isBackgroundTaskScheduler(schedulerCandidate)) {
      schedulerCandidate.postTask(callback, {
        priority: "background",
      });
      return;
    }
    if ("requestIdleCallback" in window) {
      requestIdleCallback(callback);
      return;
    }
  }
  setTimeout(callback, 0);
};
