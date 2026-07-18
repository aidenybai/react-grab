import { FROZEN_ELEMENT_ATTRIBUTE, WAAPI_GLOBAL_FREEZE_MAX_ANIMATIONS } from "../constants.js";
import { areArraysShallowEqual } from "./are-arrays-shallow-equal.js";
import { createStyleElement } from "./create-style-element.js";
import { freezeGsap, unfreezeGsap } from "./freeze-gsap.js";
import { isElementNode } from "./is-element-node.js";
import { isReactGrabHost } from "./is-react-grab-host.js";
import { isShadowRoot } from "./is-shadow-root.js";
import { IS_DEMO } from "./runtime-mode.js";
import { throwCollectedErrors } from "./throw-collected-errors.js";

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

interface GlobalAnimationSnapshot {
  targetDocument: Document;
  runningAnimations: Animation[];
}

interface GlobalAnimationFreeze {
  styleElement: HTMLStyleElement | null;
  frozenSvgElements: SVGSVGElement[];
  frozenWaapiAnimations: Animation[];
  didUseCssFreeze: boolean;
}

const isSvgRootElement = (element: Element | null): element is SVGSVGElement =>
  element?.namespaceURI === "http://www.w3.org/2000/svg" && element.tagName === "svg";

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let frozenSvgElements: SVGSVGElement[] = [];
let lastInputElements: Element[] = [];

const registeredAnimationDocuments = new Set<Document>();
const globalAnimationFreezes = new Map<Document, GlobalAnimationFreeze>();
// An SVG can be frozen by both the element-level and global freeze, so we track
// a depth counter per element and only unpause when all layers are removed.
const svgFreezeDepthMap = new Map<SVGSVGElement, number>();
let frozenWaapiAnimations: Animation[] = [];

const hasGlobalAnimationFreeze = (): boolean => globalAnimationFreezes.size > 0;

const ensureStylesInjected = (): void => {
  if (styleElement) return;
  styleElement = createStyleElement("data-react-grab-frozen-styles", FROZEN_STYLES);
};

const collectFrozenSvgElements = (elements: Element[]): SVGSVGElement[] => {
  const svgElements = new Set<SVGSVGElement>();

  for (const element of elements) {
    const containingSvgElement = isSvgRootElement(element) ? element : element.closest("svg");
    if (isSvgRootElement(containingSvgElement)) svgElements.add(containingSvgElement);

    for (const innerSvgElement of element.querySelectorAll(SVG_ROOT_SELECTOR)) {
      if (isSvgRootElement(innerSvgElement)) svgElements.add(innerSvgElement);
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

const pauseSvgAnimations = (
  svgElements: SVGSVGElement[],
  frozenSvgElementStorage: SVGSVGElement[],
): void => {
  for (const svgElement of svgElements) {
    const currentFreezeDepth = svgFreezeDepthMap.get(svgElement) ?? 0;
    if (currentFreezeDepth === 0) {
      svgFreezeDepthMap.set(svgElement, 1);
      frozenSvgElementStorage.push(svgElement);
      callSvgAnimationMethod(svgElement, "pauseAnimations");
      continue;
    }
    svgFreezeDepthMap.set(svgElement, currentFreezeDepth + 1);
    frozenSvgElementStorage.push(svgElement);
  }
};

const resumeSvgAnimations = (
  svgElements: SVGSVGElement[],
  cleanupErrors: unknown[],
): SVGSVGElement[] => {
  const svgElementsStillFrozen: SVGSVGElement[] = [];
  for (const svgElement of svgElements) {
    const currentFreezeDepth = svgFreezeDepthMap.get(svgElement);
    if (!currentFreezeDepth) continue;

    if (currentFreezeDepth === 1) {
      try {
        callSvgAnimationMethod(svgElement, "unpauseAnimations");
        svgFreezeDepthMap.delete(svgElement);
      } catch (error) {
        svgElementsStillFrozen.push(svgElement);
        cleanupErrors.push(error);
      }
      continue;
    }

    svgFreezeDepthMap.set(svgElement, currentFreezeDepth - 1);
  }
  return svgElementsStillFrozen;
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

const restorePausedAnimations = (animations: Iterable<Animation>): void => {
  for (const animation of animations) {
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
};

// Animations whose target lives in a shadow root are react-grab's own toolbar/
// label animations — the global freeze must leave them running.
// @see https://github.com/aidenybai/react-grab/issues/163
const isShadowAnimation = (animation: Animation): boolean => {
  if (!(animation.effect instanceof KeyframeEffect)) return false;
  const target = animation.effect.target;
  if (!isElementNode(target)) return false;
  const rootNode = target.getRootNode();
  return isShadowRoot(rootNode) && isReactGrabHost(rootNode.host);
};

export const freezeAllAnimations = (elements: Element[]): void => {
  if (IS_DEMO) return;
  if (elements.length === 0) return;
  if (areArraysShallowEqual(elements, lastInputElements)) return;

  unfreezeAllAnimations();
  const elementSnapshot = [...elements];
  ensureStylesInjected();
  frozenElements = elementSnapshot;
  frozenSvgElements = [];
  try {
    const svgElementsToFreeze = collectFrozenSvgElements(frozenElements);
    pauseSvgAnimations(svgElementsToFreeze, frozenSvgElements);

    for (const element of frozenElements) {
      element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");
    }

    const animationsToFreeze = collectWaapiAnimations(frozenElements);
    frozenWaapiAnimations = [];
    for (const animation of animationsToFreeze) {
      animation.pause();
      frozenWaapiAnimations.push(animation);
    }
    lastInputElements = elementSnapshot;
  } catch (error) {
    try {
      unfreezeAllAnimations();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Rolling back animation freeze failed");
    }
    throw error;
  }
};

const unfreezeAllAnimations = (): void => {
  if (
    frozenElements.length === 0 &&
    frozenSvgElements.length === 0 &&
    frozenWaapiAnimations.length === 0
  )
    return;

  const elementsToUnfreeze = frozenElements;
  const svgElementsToUnfreeze = frozenSvgElements;
  const animationsToFinish = frozenWaapiAnimations;

  const cleanupErrors: unknown[] = [];
  const elementsStillFrozen: Element[] = [];
  lastInputElements = [];
  for (const element of elementsToUnfreeze) {
    try {
      element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
    } catch (error) {
      elementsStillFrozen.push(element);
      cleanupErrors.push(error);
    }
  }
  frozenElements = elementsStillFrozen;
  frozenSvgElements = resumeSvgAnimations(svgElementsToUnfreeze, cleanupErrors);
  restorePausedAnimations(animationsToFinish);
  frozenWaapiAnimations = [];
  throwCollectedErrors(cleanupErrors, "Unfreezing element animations failed");
};

export const freezeAnimations = (elements: Element[]): (() => void) => {
  if (IS_DEMO) return () => {};
  if (elements.length === 0) {
    unfreezeAllAnimations();
    return () => {};
  }

  freezeAllAnimations(elements);
  return unfreezeAllAnimations;
};

const collectDocumentAnimationsToFreeze = (targetDocument: Document): GlobalAnimationSnapshot => {
  const runningAnimations: Animation[] = [];
  for (const animation of targetDocument.getAnimations()) {
    if (isShadowAnimation(animation)) continue;
    if (animation.playState === "running") runningAnimations.push(animation);
  }
  return { targetDocument, runningAnimations };
};

const unfreezeDocumentAnimations = (targetDocument: Document): unknown[] => {
  const globalAnimationFreeze = globalAnimationFreezes.get(targetDocument);
  if (!globalAnimationFreeze) return [];

  const cleanupErrors: unknown[] = [];
  const styleElementToRemove = globalAnimationFreeze.styleElement;
  if (styleElementToRemove) {
    try {
      if (globalAnimationFreeze.didUseCssFreeze) {
        // CSS path. All paused animations must be finished before the freeze
        // stylesheet is removed, because simply removing animation-play-state:paused
        // would resume them from their mid-point and create visual jumps. finish()
        // advances them to their end state; the interim transition:none rule
        // prevents any visual flash during cleanup. Shadow-root animations are
        // skipped so react-grab's own toolbar/label animations aren't finished.
        styleElementToRemove.textContent = `
*, *::before, *::after {
  transition: none !important;
}
`;
        const animationsToFinish: Animation[] = [];
        for (const animation of targetDocument.getAnimations()) {
          if (isShadowAnimation(animation)) continue;
          animationsToFinish.push(animation);
        }
        finishAnimations(animationsToFinish);
      } else {
        // WAAPI path: restore the specific animations we paused. Finite animations
        // advance to their end (finish()) so they don't jump backward through their
        // timeline; infinite ones (finish() throws) resume looping (play()).
        restorePausedAnimations(globalAnimationFreeze.frozenWaapiAnimations);
      }
      globalAnimationFreeze.didUseCssFreeze = false;
      globalAnimationFreeze.frozenWaapiAnimations = [];
    } catch (error) {
      cleanupErrors.push(error);
    }

    try {
      styleElementToRemove.remove();
      globalAnimationFreeze.styleElement = null;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  globalAnimationFreeze.frozenSvgElements = resumeSvgAnimations(
    globalAnimationFreeze.frozenSvgElements,
    cleanupErrors,
  );
  if (
    globalAnimationFreeze.styleElement === null &&
    globalAnimationFreeze.frozenSvgElements.length === 0 &&
    globalAnimationFreeze.frozenWaapiAnimations.length === 0
  ) {
    globalAnimationFreezes.delete(targetDocument);
  }
  return cleanupErrors;
};

const applyDocumentAnimationFreeze = (snapshot: GlobalAnimationSnapshot): void => {
  if (globalAnimationFreezes.has(snapshot.targetDocument)) return;

  const animationStyleElement = createStyleElement(
    "data-react-grab-global-freeze",
    "",
    snapshot.targetDocument,
  );
  const globalAnimationFreeze: GlobalAnimationFreeze = {
    styleElement: animationStyleElement,
    frozenSvgElements: [],
    frozenWaapiAnimations: [],
    didUseCssFreeze: false,
  };
  globalAnimationFreezes.set(snapshot.targetDocument, globalAnimationFreeze);

  if (snapshot.runningAnimations.length > WAAPI_GLOBAL_FREEZE_MAX_ANIMATIONS) {
    animationStyleElement.textContent = GLOBAL_FREEZE_STYLES;
    globalAnimationFreeze.didUseCssFreeze = true;
  } else {
    for (const animation of snapshot.runningAnimations) {
      animation.pause();
      globalAnimationFreeze.frozenWaapiAnimations.push(animation);
    }
  }

  const svgElementsToFreeze = collectFrozenSvgElements(
    Array.from(snapshot.targetDocument.querySelectorAll(SVG_ROOT_SELECTOR)),
  );
  pauseSvgAnimations(svgElementsToFreeze, globalAnimationFreeze.frozenSvgElements);
};

export const registerAnimationFreezeDocument = (targetDocument: Document): (() => void) => {
  registeredAnimationDocuments.add(targetDocument);
  try {
    if (hasGlobalAnimationFreeze()) {
      applyDocumentAnimationFreeze(collectDocumentAnimationsToFreeze(targetDocument));
    }
  } catch (error) {
    registeredAnimationDocuments.delete(targetDocument);
    const rollbackErrors = unfreezeDocumentAnimations(targetDocument);
    if (rollbackErrors.length === 0) throw error;
    throw new AggregateError([error, ...rollbackErrors], "Freezing frame animations failed");
  }

  return () => {
    registeredAnimationDocuments.delete(targetDocument);
    const cleanupErrors = unfreezeDocumentAnimations(targetDocument);
    throwCollectedErrors(cleanupErrors, "Unfreezing frame animations failed");
  };
};

// READ phase. getAnimations() forces a style flush, so the caller must run this
// before any freeze-related DOM writes — otherwise a stylesheet injected just
// before it triggers a second full-document recalc (profiled at ~59ms on a
// large app even when it returns zero animations).
export const collectGlobalAnimationsToFreeze = (): GlobalAnimationSnapshot[] => {
  // Demo mode is display-only and must never freeze (or force a style flush
  // on) the host page.
  if (IS_DEMO) return [];
  if (hasGlobalAnimationFreeze()) return [];
  registeredAnimationDocuments.add(document);
  return [...registeredAnimationDocuments].map(collectDocumentAnimationsToFreeze);
};

// WRITE phase. Pure DOM writes (marker elements, animation pauses, SVG/GSAP) —
// no layout reads, so it never forces a recalc on its own.
export const applyGlobalAnimationFreeze = (snapshots: GlobalAnimationSnapshot[]): void => {
  if (IS_DEMO) return;
  if (hasGlobalAnimationFreeze()) return;

  for (const snapshot of snapshots) applyDocumentAnimationFreeze(snapshot);
  freezeGsap();
};

export const unfreezeGlobalAnimations = (): void => {
  if (!hasGlobalAnimationFreeze()) return;

  const cleanupErrors: unknown[] = [];
  for (const targetDocument of [...globalAnimationFreezes.keys()]) {
    cleanupErrors.push(...unfreezeDocumentAnimations(targetDocument));
  }
  try {
    unfreezeGsap();
  } catch (error) {
    cleanupErrors.push(error);
  }
  throwCollectedErrors(cleanupErrors, "Unfreezing global animations failed");
};
