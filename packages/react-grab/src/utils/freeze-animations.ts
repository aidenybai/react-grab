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

const SVG_ROOT_SELECTOR = "svg";

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let frozenSvgElements: SVGSVGElement[] = [];
let lastInputElements: Element[] = [];

let globalAnimationStyleElement: HTMLStyleElement | null = null;
let globalFrozenSvgElements: SVGSVGElement[] = [];
const svgFreezeDepthMap = new Map<SVGSVGElement, number>();
let frozenWaapiAnimations: Animation[] = [];

const ensureStylesInjected = (): void => {
  if (styleElement) return;
  styleElement = createStyleElement(
    "data-react-grab-frozen-styles",
    FROZEN_STYLES,
  );
};

const areElementsSame = (
  firstElements: Element[],
  secondElements: Element[],
): boolean =>
  firstElements.length === secondElements.length &&
  firstElements.every(
    (currentElement, index) => currentElement === secondElements[index],
  );

const collectFrozenSvgElements = (elements: Element[]): SVGSVGElement[] => {
  const svgElements = new Set<SVGSVGElement>();

  for (const element of elements) {
    if (element instanceof SVGSVGElement) {
      svgElements.add(element);
    } else if (element instanceof SVGElement && element.ownerSVGElement) {
      svgElements.add(element.ownerSVGElement);
    }

    for (const innerSvgElement of element.querySelectorAll(SVG_ROOT_SELECTOR)) {
      if (innerSvgElement instanceof SVGSVGElement) {
        svgElements.add(innerSvgElement);
      }
    }
  }

  return [...svgElements];
};

const callSvgAnimationMethod = (
  svgElement: SVGSVGElement,
  methodName: "pauseAnimations" | "unpauseAnimations",
): void => {
  const animationMethod = Reflect.get(svgElement, methodName);
  if (typeof animationMethod !== "function") return;
  animationMethod.call(svgElement);
};

const pauseSvgAnimations = (svgElements: SVGSVGElement[]): void => {
  for (const svgElement of svgElements) {
    const currentFreezeDepth = svgFreezeDepthMap.get(svgElement) ?? 0;
    if (currentFreezeDepth === 0) {
      callSvgAnimationMethod(svgElement, "pauseAnimations");
    }
    svgFreezeDepthMap.set(svgElement, currentFreezeDepth + 1);
  }
};

const resumeSvgAnimations = (svgElements: SVGSVGElement[]): void => {
  for (const svgElement of svgElements) {
    const currentFreezeDepth = svgFreezeDepthMap.get(svgElement);
    if (!currentFreezeDepth) continue;

    if (currentFreezeDepth === 1) {
      svgFreezeDepthMap.delete(svgElement);
      callSvgAnimationMethod(svgElement, "unpauseAnimations");
      continue;
    }

    svgFreezeDepthMap.set(svgElement, currentFreezeDepth - 1);
  }
};

const collectWaapiAnimations = (elements: Element[]): Animation[] => {
  const animations: Animation[] = [];
  for (const element of elements) {
    for (const animation of element.getAnimations({ subtree: true })) {
      if (animation.playState === "running") {
        animations.push(animation);
      }
    }
  }
  return animations;
};

const finishAnimations = (animations: Iterable<Animation>): void => {
  for (const animation of animations) {
    try {
      animation.finish();
    } catch {
      // finish() throws for infinite animations or zero playback rate
    }
  }
};

export const freezeAllAnimations = (elements: Element[]): void => {
  if (elements.length === 0) return;
  if (areElementsSame(elements, lastInputElements)) return;

  unfreezeAllAnimations();
  lastInputElements = [...elements];
  ensureStylesInjected();
  frozenElements = elements;
  frozenSvgElements = collectFrozenSvgElements(frozenElements);
  pauseSvgAnimations(frozenSvgElements);

  for (const element of frozenElements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");
  }

  frozenWaapiAnimations = collectWaapiAnimations(frozenElements);
  for (const animation of frozenWaapiAnimations) {
    animation.pause();
  }
};

const unfreezeAllAnimations = (): void => {
  if (
    frozenElements.length === 0 &&
    frozenSvgElements.length === 0 &&
    frozenWaapiAnimations.length === 0
  )
    return;

  for (const element of frozenElements) {
    element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
  }
  resumeSvgAnimations(frozenSvgElements);

  finishAnimations(frozenWaapiAnimations);

  frozenElements = [];
  frozenSvgElements = [];
  frozenWaapiAnimations = [];
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
  globalFrozenSvgElements = collectFrozenSvgElements(
    Array.from(document.querySelectorAll(SVG_ROOT_SELECTOR)),
  );
  pauseSvgAnimations(globalFrozenSvgElements);
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

  const animations: Animation[] = [];
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
    animations.push(animation);
  }
  finishAnimations(animations);

  globalAnimationStyleElement.remove();
  globalAnimationStyleElement = null;
  resumeSvgAnimations(globalFrozenSvgElements);
  globalFrozenSvgElements = [];
  unfreezeGsap();
};
