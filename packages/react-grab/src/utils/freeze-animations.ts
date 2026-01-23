import { FROZEN_ELEMENT_ATTRIBUTE } from "../constants.js";
import { getElementsAbove } from "./get-element-at-position.js";

const FROZEN_STYLES = `
[${FROZEN_ELEMENT_ATTRIBUTE}],
[${FROZEN_ELEMENT_ATTRIBUTE}] *,
[${FROZEN_ELEMENT_ATTRIBUTE}]::before,
[${FROZEN_ELEMENT_ATTRIBUTE}]::after,
[${FROZEN_ELEMENT_ATTRIBUTE}] *::before,
[${FROZEN_ELEMENT_ATTRIBUTE}] *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

const HOVER_STYLE_PROPERTIES = [
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "transform",
  "opacity",
  "outline",
  "text-decoration",
  "filter",
  "backdrop-filter",
  "scale",
  "translate",
  "rotate",
  "text-shadow",
  "border-width",
  "fill",
  "stroke",
  "stroke-width",
  "background-image",
  "visibility",
  "display",
  "clip-path",
  "height",
  "max-height",
  "overflow",
];

const MOUSE_EVENTS_TO_BLOCK = [
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mouseout",
  "pointerenter",
  "pointerleave",
  "pointerover",
  "pointerout",
] as const;

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let pausedAnimations = new Set<Animation>();
let pausedVideos: HTMLVideoElement[] = [];
let styleObserver: MutationObserver | null = null;
const frozenInlineStyles = new WeakMap<Element, string>();
let isRestoringStyles = false;
let pendingStyleRestores: HTMLElement[] = [];
let restoreFrameId: number | null = null;

const frozenHoverElements = new Map<HTMLElement, Map<string, string>>();
let pointerEventsStyle: HTMLStyleElement | null = null;

let globalPausedAnimations = new Set<Animation>();
let globalAnimationStyleElement: HTMLStyleElement | null = null;

const stopMouseEvent = (event: Event): void => {
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const originalAnimationPlay =
  // eslint-disable-next-line @typescript-eslint/unbound-method
  typeof Animation !== "undefined" ? Animation.prototype.play : undefined;

const ensureStylesInjected = (): void => {
  if (styleElement) return;

  styleElement = document.createElement("style");
  styleElement.setAttribute("data-react-grab-frozen-styles", "");
  styleElement.textContent = FROZEN_STYLES;
  document.head.appendChild(styleElement);
};

const isAnimationInFrozenScope = (animation: Animation): boolean => {
  const effect = animation.effect;
  if (!(effect instanceof KeyframeEffect)) return false;

  const target = effect.target;
  if (!target || !(target instanceof Element)) return false;

  return frozenElements.some(
    (element) => element === target || element.contains(target),
  );
};

export const freezeAllAnimations = (elements: Element[]): void => {
  if (elements.length === 0) return;

  unfreezeAllAnimations();
  ensureStylesInjected();

  const allElementsToFreeze = new Set<Element>();

  for (const element of elements) {
    allElementsToFreeze.add(element);

    const elementsAbove = getElementsAbove(element);
    for (const elementAbove of elementsAbove) {
      allElementsToFreeze.add(elementAbove);
    }
  }

  frozenElements = [...allElementsToFreeze];

  for (const element of frozenElements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");

    const animations = element.getAnimations({ subtree: true });
    for (const animation of animations) {
      if (animation.playState === "running") {
        animation.pause();
        pausedAnimations.add(animation);
      }
    }

    const videos = element.querySelectorAll<HTMLVideoElement>("video");
    for (const video of Array.from(videos)) {
      if (!video.paused) {
        video.pause();
        pausedVideos.push(video);
      }
    }
  }

  Animation.prototype.play = function () {
    if (isAnimationInFrozenScope(this)) {
      pausedAnimations.add(this);
      this.pause();
    } else {
      originalAnimationPlay?.call(this);
    }
  };

  for (const element of frozenElements) {
    if (element instanceof HTMLElement && element.hasAttribute("style")) {
      frozenInlineStyles.set(element, element.getAttribute("style") || "");
    }
    const styledElements = element.querySelectorAll<HTMLElement>("[style]");
    for (const styledElement of styledElements) {
      frozenInlineStyles.set(
        styledElement,
        styledElement.getAttribute("style") || "",
      );
    }
  }

  const scheduleStyleRestore = (target: HTMLElement): void => {
    if (!pendingStyleRestores.includes(target)) {
      pendingStyleRestores.push(target);
    }
    if (restoreFrameId === null) {
      restoreFrameId = requestAnimationFrame(() => {
        restoreFrameId = null;
        isRestoringStyles = true;
        for (const element of pendingStyleRestores) {
          const originalStyle = frozenInlineStyles.get(element);
          if (originalStyle !== undefined) {
            element.setAttribute("style", originalStyle);
          }
        }
        pendingStyleRestores = [];
        isRestoringStyles = false;
      });
    }
  };

  styleObserver = new MutationObserver((mutations) => {
    if (isRestoringStyles) return;
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style" &&
        mutation.target instanceof HTMLElement &&
        frozenInlineStyles.has(mutation.target)
      ) {
        scheduleStyleRestore(mutation.target);
      }
    }
  });

  for (const element of frozenElements) {
    styleObserver.observe(element, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });
  }
};

export const unfreezeAllAnimations = (): void => {
  if (frozenElements.length === 0) return;

  styleObserver?.disconnect();
  styleObserver = null;
  if (restoreFrameId !== null) {
    cancelAnimationFrame(restoreFrameId);
    restoreFrameId = null;
  }
  pendingStyleRestores = [];
  isRestoringStyles = false;

  if (originalAnimationPlay) {
    Animation.prototype.play = originalAnimationPlay;
  }

  for (const element of frozenElements) {
    element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
  }

  for (const animation of pausedAnimations) {
    animation.play();
  }

  for (const video of pausedVideos) {
    void video.play();
  }

  frozenElements = [];
  pausedAnimations = new Set<Animation>();
  pausedVideos = [];
};

export const freezeAnimations = (elements: Element[]): (() => void) => {
  if (elements.length === 0) {
    unfreezeAllAnimations();
    return () => {};
  }

  freezeAllAnimations(elements);
  return unfreezeAllAnimations;
};

export const freezePseudoStates = (): void => {
  if (pointerEventsStyle) return;

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, stopMouseEvent, true);
  }

  const hoveredElements = document.querySelectorAll(":hover");

  for (const element of hoveredElements) {
    if (!(element instanceof HTMLElement)) continue;

    const computed = getComputedStyle(element);
    const originalInlineStyles = new Map<string, string>();

    for (const prop of HOVER_STYLE_PROPERTIES) {
      const currentInline = element.style.getPropertyValue(prop);
      originalInlineStyles.set(prop, currentInline);

      const computedValue = computed.getPropertyValue(prop);
      element.style.setProperty(prop, computedValue, "important");
    }

    frozenHoverElements.set(element, originalInlineStyles);
  }

  pointerEventsStyle = document.createElement("style");
  pointerEventsStyle.setAttribute("data-react-grab-frozen-pseudo", "");
  pointerEventsStyle.textContent = "* { pointer-events: none !important; }";
  document.head.appendChild(pointerEventsStyle);
};

export const unfreezePseudoStates = (): void => {
  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.removeEventListener(eventType, stopMouseEvent, true);
  }

  for (const [element, originalStyles] of frozenHoverElements) {
    for (const [prop, value] of originalStyles) {
      if (value) {
        element.style.setProperty(prop, value);
      } else {
        element.style.removeProperty(prop);
      }
    }
  }
  frozenHoverElements.clear();

  pointerEventsStyle?.remove();
  pointerEventsStyle = null;
};

export const freezeGlobalAnimations = (): void => {
  if (globalAnimationStyleElement) return;

  globalAnimationStyleElement = document.createElement("style");
  globalAnimationStyleElement.setAttribute("data-react-grab-global-freeze", "");
  globalAnimationStyleElement.textContent = `
    *, *::before, *::after {
      animation-play-state: paused !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(globalAnimationStyleElement);

  const allAnimations = document.getAnimations();
  for (const animation of allAnimations) {
    if (animation.playState === "running") {
      animation.pause();
      globalPausedAnimations.add(animation);
    }
  }
};

export const unfreezeGlobalAnimations = (): void => {
  globalAnimationStyleElement?.remove();
  globalAnimationStyleElement = null;

  for (const animation of globalPausedAnimations) {
    animation.play();
  }
  globalPausedAnimations = new Set<Animation>();
};
