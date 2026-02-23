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
 * freeze with `animation-play-state: paused`), GSAP has no CSS-level pause.
 * it must be stopped at the rAF scheduling layer.
 *
 * We can't use `gsap.globalTimeline.pause()` because GSAP's ES module build
 * never sets `window.gsap` (its internal `_installScope = {}` is truthy, so
 * the `||` chain short-circuits before reaching `window`), and there's no
 * reliable way to obtain the gsap instance without user registration.
 *
 * Instead, we wrap `window.requestAnimationFrame` at module load time, before
 * GSAP initializes, so GSAP captures our wrapper into its internal `_raf`
 * variable. When a freeze is active, we check the call stack for GSAP's `_tick`
 * function name (which survives bundling/minification) and hold those callbacks
 * in a pending map instead of forwarding them to the native rAF. Non-GSAP rAF
 * calls (including react-grab's own UI, which uses `nativeRequestAnimationFrame`
 * from native-raf.ts) pass through unaffected.
 *
 * Callbacks are tagged in WeakSets after the first stack check so the `Error()`
 * cost is paid only once per unique function reference.
 */

let isRafFrozen = false;
const pendingRafCallbacks = new Map<number, FrameRequestCallback>();
let nextFakeRafId = -1;
const knownAnimationCallbacks = new WeakSet<FrameRequestCallback>();
const knownSafeCallbacks = new WeakSet<FrameRequestCallback>();

const isAnimationLibraryCallback = (
  callback: FrameRequestCallback,
): boolean => {
  if (knownAnimationCallbacks.has(callback)) return true;
  if (knownSafeCallbacks.has(callback)) return false;

  const stack = new Error().stack ?? "";
  const didMatchAnimationLibrary = stack.includes(GSAP_TICK_STACK_PATTERN);

  if (didMatchAnimationLibrary) {
    knownAnimationCallbacks.add(callback);
  } else {
    knownSafeCallbacks.add(callback);
  }

  return didMatchAnimationLibrary;
};

if (typeof window !== "undefined") {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    if (isRafFrozen && isAnimationLibraryCallback(callback)) {
      const identifier = nextFakeRafId--;
      pendingRafCallbacks.set(identifier, callback);
      return identifier;
    }
    return nativeRequestAnimationFrame(callback);
  };

  window.cancelAnimationFrame = (identifier: number): void => {
    if (pendingRafCallbacks.has(identifier)) {
      pendingRafCallbacks.delete(identifier);
      return;
    }
    nativeCancelAnimationFrame(identifier);
  };
}

const freezeRequestAnimationFrame = (): void => {
  if (isRafFrozen) return;
  isRafFrozen = true;
  pendingRafCallbacks.clear();
  nextFakeRafId = -1;
};

const unfreezeRequestAnimationFrame = (): void => {
  if (!isRafFrozen) return;
  isRafFrozen = false;

  for (const callback of pendingRafCallbacks.values()) {
    nativeRequestAnimationFrame(callback);
  }
  pendingRafCallbacks.clear();
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
