import { FROZEN_ELEMENT_ATTRIBUTE } from "../constants.js";
import { clearElementPositionCache } from "./get-element-at-position.js";
import {
  enablePointerEventsOverride,
  disablePointerEventsOverride,
} from "./pointer-events-override.js";

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

const POINTER_EVENTS_STYLES = "* { pointer-events: none !important; }";

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

const HOVER_STYLE_PROPERTIES = [
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "transform",
  "opacity",
  "outline",
  "filter",
  "scale",
  "visibility",
] as const;

const ANIMATION_CONTROLLED_PROPERTIES = [
  "opacity",
  "transform",
  "scale",
  "translate",
  "rotate",
] as const;

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let lastInputElements: Element[] = [];

const frozenHoverElements = new Map<HTMLElement, string>();
let pointerEventsStyle: HTMLStyleElement | null = null;

let globalAnimationStyleElement: HTMLStyleElement | null = null;

const stopMouseEvent = (event: Event): void => {
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const createStyleElement = (
  attribute: string,
  content: string,
): HTMLStyleElement => {
  const element = document.createElement("style");
  element.setAttribute(attribute, "");
  element.textContent = content;
  document.head.appendChild(element);
  return element;
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

  lastInputElements = [...elements];
  unfreezeAllAnimations();
  ensureStylesInjected();
  frozenElements = elements;

  for (const element of frozenElements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");
  }
};

export const unfreezeAllAnimations = (): void => {
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

interface FrozenHoverState {
  element: HTMLElement;
  originalCssText: string;
  frozenStyles: string;
}

export const freezePseudoStates = (): void => {
  if (pointerEventsStyle) return;

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, stopMouseEvent, true);
  }

  const elementsToFreeze: FrozenHoverState[] = [];

  for (const element of document.querySelectorAll(":hover")) {
    if (!(element instanceof HTMLElement)) continue;

    const originalCssText = element.style.cssText;
    const computed = getComputedStyle(element);
    let frozenStyles = originalCssText;

    for (const prop of HOVER_STYLE_PROPERTIES) {
      const computedValue = computed.getPropertyValue(prop);
      if (computedValue) {
        frozenStyles += `${prop}: ${computedValue} !important; `;
      }
    }

    elementsToFreeze.push({ element, originalCssText, frozenStyles });
  }

  for (const { element, originalCssText, frozenStyles } of elementsToFreeze) {
    frozenHoverElements.set(element, originalCssText);
    element.style.cssText = frozenStyles;
  }

  pointerEventsStyle = createStyleElement(
    "data-react-grab-frozen-pseudo",
    POINTER_EVENTS_STYLES,
  );
  enablePointerEventsOverride();
};

const hasAnimationControlledProperty = (cssText: string): boolean => {
  const lowerCssText = cssText.toLowerCase();
  return ANIMATION_CONTROLLED_PROPERTIES.some((prop) =>
    lowerCssText.includes(prop),
  );
};

export const unfreezePseudoStates = (): void => {
  disablePointerEventsOverride();
  clearElementPositionCache();

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.removeEventListener(eventType, stopMouseEvent, true);
  }

  for (const [element, originalCssText] of frozenHoverElements) {
    // HACK: For elements with animation-controlled properties (opacity, transform, etc.),
    // only remove the hover style properties we added, don't restore original cssText.
    // Animation libraries (Framer Motion, etc.) use inline styles that change over time.
    // Restoring old cssText would reset animation progress and cause visual flash.
    if (hasAnimationControlledProperty(originalCssText)) {
      for (const prop of HOVER_STYLE_PROPERTIES) {
        element.style.removeProperty(prop);
      }
    } else {
      element.style.cssText = originalCssText;
    }
  }
  frozenHoverElements.clear();

  pointerEventsStyle?.remove();
  pointerEventsStyle = null;
};

export const freezeGlobalAnimations = (): void => {
  if (globalAnimationStyleElement) return;

  globalAnimationStyleElement = createStyleElement(
    "data-react-grab-global-freeze",
    GLOBAL_FREEZE_STYLES,
  );
};

export const unfreezeGlobalAnimations = (): void => {
  globalAnimationStyleElement?.remove();
  globalAnimationStyleElement = null;
};
