import { clearElementPositionCache } from "./get-element-at-position.js";
import {
  enablePointerEventsOverride,
  disablePointerEventsOverride,
} from "./pointer-events-override.js";

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

const FOCUS_EVENTS_TO_BLOCK = ["focus", "blur", "focusin", "focusout"] as const;

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

const FOCUS_STYLE_PROPERTIES = [
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "outline",
  "outline-offset",
  "outline-width",
  "outline-color",
  "outline-style",
  "filter",
  "opacity",
  "ring-color",
  "ring-width",
] as const;

const ANIMATION_CONTROLLED_PROPERTIES = [
  "opacity",
  "transform",
  "scale",
  "translate",
  "rotate",
] as const;

interface FrozenPseudoState {
  element: HTMLElement;
  originalCssText: string;
  frozenStyles: string;
}

const frozenHoverElements = new Map<HTMLElement, string>();
const frozenFocusElements = new Map<HTMLElement, string>();
let pointerEventsStyle: HTMLStyleElement | null = null;

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

const stopEvent = (event: Event): void => {
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const preventFocusChange = (event: Event): void => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const hasAnimationControlledProperty = (cssText: string): boolean => {
  const lowerCssText = cssText.toLowerCase();
  return ANIMATION_CONTROLLED_PROPERTIES.some((prop) =>
    lowerCssText.includes(prop),
  );
};

const collectHoverStates = (): FrozenPseudoState[] => {
  const elementsToFreeze: FrozenPseudoState[] = [];

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

  return elementsToFreeze;
};

const collectFocusStates = (): FrozenPseudoState[] => {
  const elementsToFreeze: FrozenPseudoState[] = [];

  for (const element of document.querySelectorAll(":focus, :focus-visible")) {
    if (!(element instanceof HTMLElement)) continue;
    if (frozenFocusElements.has(element)) continue;

    const originalCssText = element.style.cssText;
    const computed = getComputedStyle(element);
    let frozenStyles = originalCssText;

    for (const prop of FOCUS_STYLE_PROPERTIES) {
      const computedValue = computed.getPropertyValue(prop);
      if (computedValue) {
        frozenStyles += `${prop}: ${computedValue} !important; `;
      }
    }

    elementsToFreeze.push({ element, originalCssText, frozenStyles });
  }

  return elementsToFreeze;
};

const applyFrozenStates = (
  states: FrozenPseudoState[],
  storageMap: Map<HTMLElement, string>,
): void => {
  for (const { element, originalCssText, frozenStyles } of states) {
    storageMap.set(element, originalCssText);
    element.style.cssText = frozenStyles;
  }
};

const restoreFrozenStates = (
  storageMap: Map<HTMLElement, string>,
  styleProperties: readonly string[],
): void => {
  for (const [element, originalCssText] of storageMap) {
    // HACK: For elements with animation-controlled properties (opacity, transform, etc.),
    // only remove the style properties we added, don't restore original cssText.
    // Animation libraries (Framer Motion, etc.) use inline styles that change over time.
    // Restoring old cssText would reset animation progress and cause visual flash.
    if (hasAnimationControlledProperty(originalCssText)) {
      for (const prop of styleProperties) {
        element.style.removeProperty(prop);
      }
    } else {
      element.style.cssText = originalCssText;
    }
  }
  storageMap.clear();
};

export const freezePseudoStates = (): void => {
  if (pointerEventsStyle) return;

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, stopEvent, true);
  }

  for (const eventType of FOCUS_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, preventFocusChange, true);
  }

  const hoverStates = collectHoverStates();
  const focusStates = collectFocusStates();

  applyFrozenStates(hoverStates, frozenHoverElements);
  applyFrozenStates(focusStates, frozenFocusElements);

  pointerEventsStyle = createStyleElement(
    "data-react-grab-frozen-pseudo",
    POINTER_EVENTS_STYLES,
  );
  enablePointerEventsOverride();
};

export const unfreezePseudoStates = (): void => {
  disablePointerEventsOverride();
  clearElementPositionCache();

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.removeEventListener(eventType, stopEvent, true);
  }

  for (const eventType of FOCUS_EVENTS_TO_BLOCK) {
    document.removeEventListener(eventType, preventFocusChange, true);
  }

  restoreFrozenStates(frozenHoverElements, HOVER_STYLE_PROPERTIES);
  restoreFrozenStates(frozenFocusElements, FOCUS_STYLE_PROPERTIES);

  pointerEventsStyle?.remove();
  pointerEventsStyle = null;
};
