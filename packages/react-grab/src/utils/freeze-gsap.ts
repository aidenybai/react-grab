// GSAP drives all animations through a single `_tick` callback scheduled via
// requestAnimationFrame, and there is no public API to pause or resume it
// globally. To freeze GSAP we wrap window.requestAnimationFrame at module load
// time (before GSAP captures it) and, during freeze, inspect the call stack for
// the `_tick` function name to identify GSAP callbacks and hold them until
// unfreeze, at which point they are replayed.
//
// The stack inspection via new Error().stack is expensive but only runs during
// freeze. Detected callbacks are cached in a WeakSet so subsequent checks are
// O(1). Held callbacks receive fake negative IDs to distinguish them from native
// rAF IDs, and cancelAnimationFrame handles both ID spaces transparently.
// react-grab's own code uses native-raf.ts to bypass this wrapper entirely.

import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "./native-raf.js";

let isRafFrozen = false;
const pendingRafCallbacks = new Map<number, FrameRequestCallback>();
let nextFakeRafId = -1;
const knownAnimationCallbacks = new WeakSet<FrameRequestCallback>();
const nativeIdToHeldId = new Map<number, number>();
const replayedFakeToNativeId = new Map<
  number,
  { nativeId: number; callback: FrameRequestCallback }
>();

const isAnimationLibraryCallback = (
  callback: FrameRequestCallback,
): boolean => {
  if (knownAnimationCallbacks.has(callback)) return true;
  if (!isRafFrozen || !("gsapVersions" in window)) return false;

  const stack = new Error().stack ?? "";
  if (!stack.includes("_tick")) return false;

  knownAnimationCallbacks.add(callback);
  return true;
};

if (typeof window !== "undefined") {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    if (!isAnimationLibraryCallback(callback)) {
      return nativeRequestAnimationFrame(callback);
    }

    if (isRafFrozen) {
      const identifier = nextFakeRafId--;
      pendingRafCallbacks.set(identifier, callback);
      return identifier;
    }

    const nativeId = nativeRequestAnimationFrame(
      (timestamp: DOMHighResTimeStamp) => {
        if (isRafFrozen) {
          const identifier = nextFakeRafId--;
          pendingRafCallbacks.set(identifier, callback);
          nativeIdToHeldId.set(nativeId, identifier);
          return;
        }
        callback(timestamp);
      },
    );
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

export const freezeGsap = (): void => {
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

export const unfreezeGsap = (): void => {
  if (!isRafFrozen) return;
  isRafFrozen = false;

  for (const [fakeId, callback] of pendingRafCallbacks.entries()) {
    const nativeId = nativeRequestAnimationFrame((timestamp) => {
      replayedFakeToNativeId.delete(fakeId);
      callback(timestamp);
    });
    replayedFakeToNativeId.set(fakeId, { nativeId, callback });
  }
  pendingRafCallbacks.clear();
  nativeIdToHeldId.clear();
};
