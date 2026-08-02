// Recurring animation loops schedule the same callback from inside itself.
// Tracking that call relationship lets us pause Three.js, GSAP, and hand-written
// requestAnimationFrame loops without intercepting one-shot layout callbacks.
//
// GSAP also receives a stack-based fallback because some builds schedule through
// an indirection rather than passing the currently executing callback directly.
// The stack inspection via new Error().stack is expensive but only runs during
// freeze. Detected callbacks are cached in WeakSets so subsequent checks are
// O(1). Held callbacks receive fake negative IDs to distinguish them from native
// rAF IDs, and cancelAnimationFrame handles both ID spaces transparently.
// react-grab's own code uses native-raf.ts to bypass this wrapper entirely.

import { ANIMATION_FRAME_LOOP_MIN_SELF_SCHEDULES } from "../constants.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./native-raf.js";

interface ReplayedAnimationFrame {
  nativeId: number;
  callback: FrameRequestCallback;
}

let isRafFrozen = false;
let executingRafCallback: FrameRequestCallback | null = null;
let didExecutingRafCallbackSelfSchedule = false;
const pendingRafCallbacks = new Map<number, FrameRequestCallback>();
let nextFakeRafId = -1;
const knownAnimationCallbacks = new WeakSet<FrameRequestCallback>();
const stackDetectedAnimationCallbacks = new WeakSet<FrameRequestCallback>();
const selfScheduleCounts = new WeakMap<FrameRequestCallback, number>();
const nativeIdToHeldId = new Map<number, number>();
const replayedFakeToNativeId = new Map<number, ReplayedAnimationFrame>();

const isAnimationLoopCallback = (callback: FrameRequestCallback): boolean => {
  if (executingRafCallback === callback) didExecutingRafCallbackSelfSchedule = true;
  if (knownAnimationCallbacks.has(callback)) return true;
  if (!isRafFrozen && executingRafCallback === callback) {
    const selfScheduleCount = (selfScheduleCounts.get(callback) ?? 0) + 1;
    selfScheduleCounts.set(callback, selfScheduleCount);
    if (selfScheduleCount < ANIMATION_FRAME_LOOP_MIN_SELF_SCHEDULES) return false;
    knownAnimationCallbacks.add(callback);
    return true;
  }
  if (!isRafFrozen || !("gsapVersions" in window)) return false;

  const stack = new Error().stack ?? "";
  if (!stack.includes("_tick")) return false;

  knownAnimationCallbacks.add(callback);
  stackDetectedAnimationCallbacks.add(callback);
  return true;
};

if (typeof window !== "undefined") {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const isAnimationLoop = isAnimationLoopCallback(callback);

    if (isRafFrozen && isAnimationLoop) {
      const identifier = nextFakeRafId--;
      pendingRafCallbacks.set(identifier, callback);
      return identifier;
    }

    const nativeId = nativeRequestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
      if (isRafFrozen && isAnimationLoopCallback(callback)) {
        const identifier = nextFakeRafId--;
        pendingRafCallbacks.set(identifier, callback);
        nativeIdToHeldId.set(nativeId, identifier);
        return;
      }
      const previousExecutingRafCallback = executingRafCallback;
      const previousDidExecutingRafCallbackSelfSchedule = didExecutingRafCallbackSelfSchedule;
      executingRafCallback = callback;
      didExecutingRafCallbackSelfSchedule = false;
      try {
        callback(timestamp);
      } finally {
        const didSelfSchedule = didExecutingRafCallbackSelfSchedule;
        executingRafCallback = previousExecutingRafCallback;
        didExecutingRafCallbackSelfSchedule = previousDidExecutingRafCallbackSelfSchedule;
        if (!didSelfSchedule && !stackDetectedAnimationCallbacks.has(callback)) {
          knownAnimationCallbacks.delete(callback);
          selfScheduleCounts.delete(callback);
        }
      }
    });
    return nativeId;
  };

  window.cancelAnimationFrame = (identifier: number): void => {
    if (pendingRafCallbacks.has(identifier)) {
      pendingRafCallbacks.delete(identifier);
      return;
    }
    const replayed = replayedFakeToNativeId.get(identifier);
    if (replayed !== undefined) {
      nativeCancelAnimationFrame(replayed.nativeId);
      replayedFakeToNativeId.delete(identifier);
      return;
    }
    const heldId = nativeIdToHeldId.get(identifier);
    if (heldId !== undefined) {
      pendingRafCallbacks.delete(heldId);
      nativeIdToHeldId.delete(identifier);
      return;
    }
    nativeCancelAnimationFrame(identifier);
  };
}

export const freezeAnimationFrameLoops = (): void => {
  if (isRafFrozen) return;
  isRafFrozen = true;
  pendingRafCallbacks.clear();
  nativeIdToHeldId.clear();
  for (const [fakeId, { nativeId, callback }] of replayedFakeToNativeId) {
    nativeCancelAnimationFrame(nativeId);
    pendingRafCallbacks.set(fakeId, callback);
  }
  replayedFakeToNativeId.clear();
};

export const unfreezeAnimationFrameLoops = (): void => {
  if (!isRafFrozen) return;
  isRafFrozen = false;

  for (const [fakeId, callback] of pendingRafCallbacks.entries()) {
    const nativeId = nativeRequestAnimationFrame((timestamp) => {
      replayedFakeToNativeId.delete(fakeId);
      const previousExecutingRafCallback = executingRafCallback;
      const previousDidExecutingRafCallbackSelfSchedule = didExecutingRafCallbackSelfSchedule;
      executingRafCallback = callback;
      didExecutingRafCallbackSelfSchedule = false;
      try {
        callback(timestamp);
      } finally {
        const didSelfSchedule = didExecutingRafCallbackSelfSchedule;
        executingRafCallback = previousExecutingRafCallback;
        didExecutingRafCallbackSelfSchedule = previousDidExecutingRafCallbackSelfSchedule;
        if (!didSelfSchedule && !stackDetectedAnimationCallbacks.has(callback)) {
          knownAnimationCallbacks.delete(callback);
          selfScheduleCounts.delete(callback);
        }
      }
    });
    replayedFakeToNativeId.set(fakeId, { nativeId, callback });
  }
  pendingRafCallbacks.clear();
  nativeIdToHeldId.clear();
};
