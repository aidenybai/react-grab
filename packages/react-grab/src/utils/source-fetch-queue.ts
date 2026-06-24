import { SOURCE_FETCH_TIMEOUT_MS } from "../constants.js";

// Cap on react-grab's own concurrent source-resolution fetches.
//
// Resolving a grabbed element's source location fetches its JS bundle and source
// map (through bippy) and, on Next.js, POSTs to the dev symbolication endpoint.
// In development these run over HTTP/1.1, where Chrome keeps at most ~6 open
// connections per origin. A real app's data fetches routinely hold all 6 (a
// dashboard waiting on several slow API calls), so a react-grab fetch waits in
// the browser's connection queue behind them. That wait is what surfaces as the
// "Grabbing…" state never resolving.
//
// We cannot speed up the app's requests, so we avoid adding to the pressure
// instead: capping our own in-flight fetches below the pool size leaves
// connections for the page and bounds the fan-out when a drag-select hovers
// dozens of elements in a row. Without the cap each hovered element starts its
// own fetch at once, and react-grab becomes part of the saturation it is
// waiting on.
//
// This is deliberately NOT the `keepalive` request limit. `keepalive` (the
// modern navigator.sendBeacon) keeps a request alive across a page navigation,
// but the Fetch spec caps its body at 64 KB and allows only ~15 inflight
// keepalive requests for the whole page; source bundles are larger than 64 KB
// and a grab never navigates away, so keepalive does not apply here. The limit
// we work around is the ordinary per-origin connection pool, which constrains
// every fetch whether or not it sets keepalive.
const MAX_CONCURRENT_SOURCE_FETCHES = 3;

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
// when the fetch settles or after SOURCE_FETCH_TIMEOUT_MS, whichever comes
// first.
//
// The timeout is a backstop, not a latency budget: a healthy fetch finishes well
// under it, and source paths for app-owned components resolve from React's own
// fiber data without any network at all, so a timeout degrades only the deeper
// trace context, never the primary source path. It exists because bippy's bundle
// fetch has no AbortSignal we can cancel; without an upper bound, one stuck fetch
// would hold its slot forever and stall every queued grab behind it. The orphaned
// fetch keeps running and still occupies a real connection until the browser
// settles it, so the cap is soft under a sustained hang, but the queue and the
// grab both stay responsive.
export const runQueuedSourceFetch = async <T>(
  task: () => Promise<T>,
  fallback: T,
  timeoutMs: number = SOURCE_FETCH_TIMEOUT_MS,
): Promise<T> => {
  await acquireSlot();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  const taskPromise = task();
  // Swallow a late rejection from a fetch that already lost the timeout race, so
  // an orphaned request never surfaces as an unhandled rejection.
  taskPromise.catch(() => {});

  try {
    return await Promise.race([taskPromise, timeout]);
  } finally {
    clearTimeout(timeoutId);
    releaseSlot();
  }
};
