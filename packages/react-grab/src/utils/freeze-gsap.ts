/**
 * GSAP rAF interception
 *
 * GSAP drives animations through an internal `_tick` function scheduled via
 * requestAnimationFrame. We wrap rAF at module load time so GSAP captures our
 * wrapper. When frozen and `window.gsapVersions` exists (set by GSAP on import),
 * we inspect the call stack for `_tick` and hold matching callbacks.
 *
 * Stack inspection is deferred until freeze, so `Error()` is never paid during
 * normal operation. Detected callbacks are cached in a WeakSet for free lookups.
 */

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
