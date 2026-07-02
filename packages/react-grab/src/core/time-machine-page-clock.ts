// Freezing WAAPI/CSS animations is not enough to stop a page's motion: apps
// also animate through requestAnimationFrame loops, setTimeout chains, and
// setInterval tickers (text scramblers, typewriters, carousels), all of which
// keep mutating state and DOM while the time machine sits rewound — scrubbing
// then fights a live animation engine and the page flickers between recorded
// and freshly-animated frames. This module suspends the page's scheduling
// clock while rewound.
//
// Interception wraps callbacks at schedule time and decides at FIRE time
// (mirroring freeze-gsap's approach): self-rescheduling loops started before
// interception get caught on their next iteration. While frozen, rAF and
// timeout callbacks park (replayed in order on release) and interval ticks
// drop (a frozen clock doesn't owe missed ticks). React's work loop schedules
// through MessageChannel, so travel commits still flush while frozen, and
// react-grab's own UI schedules through native-raf/native-timers, which
// bypass these wrappers.
import { nativeRequestAnimationFrame } from "../utils/native-raf.js";
import { nativeSetTimeout } from "../utils/native-timers.js";

let isPageClockFrozen = false;
let isInstalled = false;

const parkedRafCallbacks = new Map<number, FrameRequestCallback>();
const parkedTimeoutCallbacks = new Map<number, () => void>();

export const installPageClockInterception = (): void => {
  if (isInstalled || typeof window === "undefined") return;
  isInstalled = true;

  // requestAnimationFrame may already be wrapped by freeze-gsap (installed at
  // its module load); capturing the current implementations composes the two.
  const previousRaf = window.requestAnimationFrame.bind(window);
  const previousCancelRaf = window.cancelAnimationFrame.bind(window);
  const previousSetTimeout = window.setTimeout.bind(window);
  const previousClearTimeout = window.clearTimeout.bind(window);
  const previousSetInterval = window.setInterval.bind(window);

  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    let frameId = 0;
    frameId = previousRaf((timestamp: DOMHighResTimeStamp) => {
      if (isPageClockFrozen) {
        parkedRafCallbacks.set(frameId, callback);
        return;
      }
      callback(timestamp);
    });
    return frameId;
  };

  window.cancelAnimationFrame = (identifier: number): void => {
    parkedRafCallbacks.delete(identifier);
    previousCancelRaf(identifier);
  };

  window.setTimeout = ((handler: TimerHandler, delayMs?: number, ...args: unknown[]): number => {
    if (typeof handler !== "function") {
      return previousSetTimeout(handler, delayMs, ...args);
    }
    let timerId = 0;
    timerId = previousSetTimeout(() => {
      if (isPageClockFrozen) {
        parkedTimeoutCallbacks.set(timerId, () => handler(...args));
        return;
      }
      handler(...args);
    }, delayMs);
    return timerId;
  }) as typeof window.setTimeout;

  window.clearTimeout = ((identifier?: number): void => {
    if (typeof identifier === "number") parkedTimeoutCallbacks.delete(identifier);
    previousClearTimeout(identifier);
  }) as typeof window.clearTimeout;

  window.setInterval = ((handler: TimerHandler, delayMs?: number, ...args: unknown[]): number => {
    if (typeof handler !== "function") {
      return previousSetInterval(handler, delayMs, ...args);
    }
    return previousSetInterval(() => {
      if (isPageClockFrozen) return;
      handler(...args);
    }, delayMs);
  }) as typeof window.setInterval;
};

export const freezePageClock = (): void => {
  if (isPageClockFrozen) return;
  installPageClockInterception();
  isPageClockFrozen = true;
};

// Parked callbacks replay through the real scheduler rather than running
// synchronously: an rAF callback invoked outside a frame (or a timer callback
// re-entering React mid-travel) is exactly the kind of inconsistency the
// freeze exists to prevent.
export const releasePageClock = (): void => {
  if (!isPageClockFrozen) return;
  isPageClockFrozen = false;

  const rafCallbacksToReplay = Array.from(parkedRafCallbacks.values());
  parkedRafCallbacks.clear();
  for (const callback of rafCallbacksToReplay) {
    nativeRequestAnimationFrame(callback);
  }

  const timeoutCallbacksToReplay = Array.from(parkedTimeoutCallbacks.values());
  parkedTimeoutCallbacks.clear();
  for (const callback of timeoutCallbacksToReplay) {
    nativeSetTimeout(callback, 0);
  }
};
