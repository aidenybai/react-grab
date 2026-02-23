import {
  FROZEN_ELEMENT_ATTRIBUTE,
  GSAP_TICK_STACK_PATTERN,
} from "../constants.js";
import { createStyleElement } from "./create-style-element.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "./native-raf.js";

const FROZEN_STYLES = `
[${FROZEN_ELEMENT_ATTRIBUTE}],
[${FROZEN_ELEMENT_ATTRIBUTE}] * {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

const GLOBAL_FREEZE_STYLES = `
*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let lastInputElements: Element[] = [];

let globalAnimationStyleElement: HTMLStyleElement | null = null;

/**
 * GSAP rAF interception
 *
 * GSAP drives its entire animation engine through a single internal `_tick`
 * function scheduled via requestAnimationFrame. Unlike CSS animations (which we
 * freeze with `animation-play-state: paused`), GSAP has no CSS-level pause —
 * it must be stopped at the rAF scheduling layer.
 *
 * Two complementary strategies are used:
 *
 * 1. rAF wrapper (handles case where react-grab loads BEFORE GSAP):
 *    We wrap `window.requestAnimationFrame` at module load time so GSAP captures
 *    our wrapper into its internal `_raf` variable. When frozen, we check the
 *    call stack for GSAP's `_tick` function name and hold those callbacks.
 *
 * 2. Direct GSAP instance pause (handles case where GSAP loads BEFORE react-grab):
 *    If GSAP captured the original native rAF before our wrapper was installed,
 *    the rAF wrapper is bypassed entirely. To handle this, we detect the GSAP
 *    instance at freeze time via `window.gsap` and call `ticker.sleep()` and
 *    `globalTimeline.pause()` directly.
 *
 * Callbacks are tagged in WeakSets after the first stack check so the `Error()`
 * cost is paid only once per unique function reference.
 */

interface GsapLikeInstance {
  ticker?: { sleep: () => void; wake: () => void };
  globalTimeline?: { pause: () => void; resume: () => void };
}

let frozenGsapInstance: GsapLikeInstance | null = null;

const hasMethod = (target: unknown, methodName: string): boolean =>
  typeof target === "object" &&
  target !== null &&
  typeof (target as Record<string, unknown>)[methodName] === "function";

const isGsapLikeObject = (value: unknown): value is GsapLikeInstance => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    hasMethod(candidate.ticker, "sleep") &&
    hasMethod(candidate.globalTimeline, "pause")
  );
};

const findGsapInstance = (): GsapLikeInstance | null => {
  if (typeof window === "undefined") return null;

  const globalGsap = (window as unknown as Record<string, unknown>).gsap;
  return isGsapLikeObject(globalGsap) ? globalGsap : null;
};

let isRafFrozen = false;
const pendingRafCallbacks = new Map<number, FrameRequestCallback>();
let nextFakeRafId = -1;
const knownAnimationCallbacks = new WeakSet<FrameRequestCallback>();
const nativeIdToHeldId = new Map<number, number>();

const isAnimationLibraryCallback = (
  callback: FrameRequestCallback,
): boolean => {
  if (knownAnimationCallbacks.has(callback)) return true;

  const stack = new Error().stack ?? "";
  const didMatchAnimationLibrary = stack.includes(GSAP_TICK_STACK_PATTERN);

  if (didMatchAnimationLibrary) {
    knownAnimationCallbacks.add(callback);
  }

  return didMatchAnimationLibrary;
};

if (typeof window !== "undefined") {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const isAnimation = isAnimationLibraryCallback(callback);

    if (isRafFrozen && isAnimation) {
      const identifier = nextFakeRafId--;
      pendingRafCallbacks.set(identifier, callback);
      return identifier;
    }

    if (isAnimation) {
      let nativeId: number;
      nativeId = nativeRequestAnimationFrame(
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
    }

    return nativeRequestAnimationFrame(callback);
  };

  window.cancelAnimationFrame = (identifier: number): void => {
    if (pendingRafCallbacks.has(identifier)) {
      pendingRafCallbacks.delete(identifier);
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

const freezeRequestAnimationFrame = (): void => {
  if (isRafFrozen) return;
  isRafFrozen = true;
  pendingRafCallbacks.clear();
  nativeIdToHeldId.clear();
  nextFakeRafId = -1;

  const gsapInstance = findGsapInstance();
  if (gsapInstance) {
    gsapInstance.ticker?.sleep();
    gsapInstance.globalTimeline?.pause();
    frozenGsapInstance = gsapInstance;
  }
};

const unfreezeRequestAnimationFrame = (): void => {
  if (!isRafFrozen) return;
  isRafFrozen = false;

  if (frozenGsapInstance) {
    frozenGsapInstance.globalTimeline?.resume();
    frozenGsapInstance.ticker?.wake();
    frozenGsapInstance = null;
  }

  for (const callback of pendingRafCallbacks.values()) {
    nativeRequestAnimationFrame(callback);
  }
  pendingRafCallbacks.clear();
  nativeIdToHeldId.clear();
};

const ensureStylesInjected = (): void => {
  if (styleElement) return;
  styleElement = createStyleElement(
    "data-react-grab-frozen-styles",
    FROZEN_STYLES,
  );
};

const areElementsSame = (a: Element[], b: Element[]): boolean =>
  a.length === b.length && a.every((element, index) => element === b[index]);

export const freezeAllAnimations = (elements: Element[]): void => {
  if (elements.length === 0) return;
  if (areElementsSame(elements, lastInputElements)) return;

  unfreezeAllAnimations();
  lastInputElements = [...elements];
  ensureStylesInjected();
  frozenElements = elements;

  for (const element of frozenElements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");
  }
};

const unfreezeAllAnimations = (): void => {
  if (frozenElements.length === 0) return;

  for (const element of frozenElements) {
    element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
  }

  frozenElements = [];
  lastInputElements = [];
};

export const freezeAnimations = (elements: Element[]): (() => void) => {
  if (elements.length === 0) {
    unfreezeAllAnimations();
    return () => {};
  }

  freezeAllAnimations(elements);
  return unfreezeAllAnimations;
};

export const freezeGlobalAnimations = (): void => {
  if (globalAnimationStyleElement) return;

  globalAnimationStyleElement = createStyleElement(
    "data-react-grab-global-freeze",
    GLOBAL_FREEZE_STYLES,
  );
  freezeRequestAnimationFrame();
};

export const unfreezeGlobalAnimations = (): void => {
  if (!globalAnimationStyleElement) return;

  // HACK: Finish all paused CSS animations before removing the freeze style.
  // Simply removing the pause causes animations to resume from mid-point,
  // creating visual "jumps" (e.g., dropdowns snapping through entry animation).
  // Finishing advances them to their end state instead.
  globalAnimationStyleElement.textContent = `
*, *::before, *::after {
  transition: none !important;
}
`;

  for (const animation of document.getAnimations()) {
    if (animation.effect instanceof KeyframeEffect) {
      const target = animation.effect.target;
      if (target instanceof Element) {
        const rootNode = target.getRootNode();
        if (rootNode instanceof ShadowRoot) {
          continue;
        }
      }
    }

    try {
      animation.finish();
    } catch {
      // HACK: finish() throws for infinite animations or zero playback rate
    }
  }

  globalAnimationStyleElement.remove();
  globalAnimationStyleElement = null;
  unfreezeRequestAnimationFrame();
};
