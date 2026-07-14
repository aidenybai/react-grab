import { MAX_CONCURRENT_SOURCE_FETCHES, SOURCE_FETCH_TIMEOUT_MS } from "../constants.js";

let activeFetchCount = 0;
const waitingForSlot: Array<() => void> = [];

const acquireSlot = (): Promise<void> => {
  if (activeFetchCount < MAX_CONCURRENT_SOURCE_FETCHES) {
    activeFetchCount += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waitingForSlot.push(resolve);
  });
};

const releaseSlot = (): void => {
  // Hand the freed slot straight to the next waiter rather than decrementing,
  // so the active count stays at the cap while work remains queued.
  const nextWaiter = waitingForSlot.shift();
  if (nextWaiter) {
    nextWaiter();
    return;
  }
  activeFetchCount -= 1;
};

// Runs a source-resolution fetch under the concurrency cap, releasing its slot
// when the task settles or after SOURCE_FETCH_TIMEOUT_MS, whichever comes first.
//
// The task receives an AbortSignal that fires on timeout. Passing it to the
// fetches bippy makes (via its fetchFn hook) cancels the in-flight request, so a
// stuck fetch releases both its queue slot and its real connection rather than
// lingering. Without this the cap would be soft under a sustained hang.
//
// The timeout is a backstop, not a latency budget: a healthy fetch finishes well
// under it, and source paths for app-owned components resolve from React's own
// fiber data without any network at all, so a timeout degrades only the deeper
// trace context, never the primary source path.
export const runQueuedSourceFetch = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  timeoutMs: number = SOURCE_FETCH_TIMEOUT_MS,
): Promise<T> => {
  await acquireSlot();

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const taskPromise = task(controller.signal);
    // Swallow a late rejection from a fetch that already lost the timeout race, so
    // an aborted request never surfaces as an unhandled rejection.
    taskPromise.catch(() => {});
    return await Promise.race([taskPromise, timeout]);
  } finally {
    clearTimeout(timeoutId);
    releaseSlot();
  }
};
