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

// Pausing animations individually via WAAPI avoids the full-document style
// recalc that a universal `*` selector forces — profiled at ~62ms on a real
// (CSS-heavy) app even with a single animation on the page. But each WAAPI
// pause/finish has a per-animation cost, so above this many running animations
// one batched `*`-selector recalc wins. Real apps sit far below this; the
// threshold only guards pathological animation-heavy pages.
const WAAPI_GLOBAL_FREEZE_MAX_ANIMATIONS = 200;

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let frozenSvgElements: SVGSVGElement[] = [];
let lastInputElements: Element[] = [];

let globalAnimationStyleElement: HTMLStyleElement | null = null;
let globalFrozenSvgElements: SVGSVGElement[] = [];
// Animations paused directly (WAAPI path); empty when the `*`-selector CSS path
// was used instead. globalUsedCssFreeze records which path freeze took so
// unfreeze can mirror it.
let globalFrozenWaapiAnimations: Animation[] = [];
let globalUsedCssFreeze = false;
// An SVG can be frozen by both the element-level and global freeze, so we track
// a depth counter per element and only unpause when all layers are removed.
const svgFreezeDepthMap = new Map<SVGSVGElement, number>();
let frozenWaapiAnimations: Animation[] = [];

const ensureStylesInjected = (): void => {
  if (styleElement) return;
  styleElement = createStyleElement("data-react-grab-frozen-styles", FROZEN_STYLES);
};

const areElementsSame = (firstElements: Element[], secondElements: Element[]): boolean =>
  firstElements.length === secondElements.length &&
  firstElements.every((currentElement, index) => currentElement === secondElements[index]);

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

// Animations whose target lives in a shadow root are react-grab's own toolbar/
// label animations — the global freeze must leave them running.
// @see https://github.com/aidenybai/react-grab/issues/163
const isShadowAnimation = (animation: Animation): boolean => {
  if (!(animation.effect instanceof KeyframeEffect)) return false;
  const target = animation.effect.target;
  return target instanceof Element && target.getRootNode() instanceof ShadowRoot;
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

// READ phase. document.getAnimations() forces a style flush, so the caller
// must run this before any freeze-related DOM writes — otherwise a stylesheet
// injected just before it triggers a second full-document recalc (profiled at
// ~59ms on a large app even when it returns zero animations).
export const collectGlobalAnimationsToFreeze = (): Animation[] => {
  if (globalAnimationStyleElement) return [];
  const runningAnimations: Animation[] = [];
  for (const animation of document.getAnimations()) {
    if (isShadowAnimation(animation)) continue; // leave react-grab's own UI running
    if (animation.playState === "running") runningAnimations.push(animation);
  }
  return runningAnimations;
};

// WRITE phase. Pure DOM writes (marker element, animation pause, SVG/GSAP) — no
// layout reads, so it never forces a recalc on its own.
export const applyGlobalAnimationFreeze = (runningAnimations: Animation[]): void => {
  if (globalAnimationStyleElement) return;

  // Marker element; also carries the `*` freeze rule on the CSS path below. Its
  // presence signals the global freeze is active (asserted by the e2e suite).
  globalAnimationStyleElement = createStyleElement("data-react-grab-global-freeze", "");

  if (runningAnimations.length > WAAPI_GLOBAL_FREEZE_MAX_ANIMATIONS) {
    // Many animations: one batched universal-selector recalc beats thousands of
    // individual WAAPI pauses.
    globalAnimationStyleElement.textContent = GLOBAL_FREEZE_STYLES;
    globalUsedCssFreeze = true;
    globalFrozenWaapiAnimations = [];
  } else {
    // Few animations (the common case): pause them directly. This touches only
    // the animating elements instead of forcing a full-document style recalc.
    for (const animation of runningAnimations) animation.pause();
    globalFrozenWaapiAnimations = runningAnimations;
    globalUsedCssFreeze = false;
  }

  globalFrozenSvgElements = collectFrozenSvgElements(
    Array.from(document.querySelectorAll(SVG_ROOT_SELECTOR)),
  );
  pauseSvgAnimations(globalFrozenSvgElements);
  freezeGsap();
};

export const freezeGlobalAnimations = (): void => {
  if (globalAnimationStyleElement) return;
  applyGlobalAnimationFreeze(collectGlobalAnimationsToFreeze());
};

export const unfreezeGlobalAnimations = (): void => {
  if (!globalAnimationStyleElement) return;

  if (globalUsedCssFreeze) {
    // CSS path. All paused animations must be finished before the freeze
    // stylesheet is removed, because simply removing animation-play-state:paused
    // would resume them from their mid-point and create visual jumps. finish()
    // advances them to their end state; the interim transition:none rule
    // prevents any visual flash during cleanup. Shadow-root animations are
    // skipped so react-grab's own toolbar/label animations aren't finished.
    globalAnimationStyleElement.textContent = `
*, *::before, *::after {
  transition: none !important;
}
`;
    const animationsToFinish: Animation[] = [];
    for (const animation of document.getAnimations()) {
      if (isShadowAnimation(animation)) continue;
      animationsToFinish.push(animation);
    }
    finishAnimations(animationsToFinish);
    globalUsedCssFreeze = false;
  } else {
    // WAAPI path: restore the specific animations we paused. Finite animations
    // advance to their end (finish()) so they don't jump backward through their
    // timeline; infinite ones (finish() throws) resume looping (play()).
    for (const animation of globalFrozenWaapiAnimations) {
      try {
        animation.finish();
      } catch {
        try {
          animation.play();
        } catch {
          // animation was cancelled or its target detached during the freeze
        }
      }
    }
    globalFrozenWaapiAnimations = [];
  }

  globalAnimationStyleElement.remove();
  globalAnimationStyleElement = null;
  resumeSvgAnimations(globalFrozenSvgElements);
  globalFrozenSvgElements = [];
  unfreezeGsap();
};
