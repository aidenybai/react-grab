import { FROZEN_ELEMENT_ATTRIBUTE } from "../constants.js";
import { createStyleElement } from "./create-style-element.js";
import { freezeGsap, unfreezeGsap } from "./freeze-gsap.js";

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
  freezeGsap();
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
  unfreezeGsap();
};
