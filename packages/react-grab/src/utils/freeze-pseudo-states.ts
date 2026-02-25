import { clearElementPositionCache } from "./get-element-at-position.js";
import { createStyleElement } from "./create-style-element.js";

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

interface FrozenPseudoState {
  element: HTMLElement;
  frozenStyles: string;
  originalPropertyValues: Map<string, string>;
}

const frozenHoverElements = new Map<HTMLElement, Map<string, string>>();
const frozenFocusElements = new Map<HTMLElement, Map<string, string>>();
let pointerEventsStyle: HTMLStyleElement | null = null;

const stopEvent = (event: Event): void => {
  event.stopImmediatePropagation();
};

const preventFocusChange = (event: Event): void => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

const collectOriginalPropertyValues = (
  element: HTMLElement,
  properties: readonly string[],
): Map<string, string> => {
  const originalPropertyValues = new Map<string, string>();
  for (const prop of properties) {
    const inlineValue = element.style.getPropertyValue(prop);
    if (inlineValue) {
      originalPropertyValues.set(prop, inlineValue);
    }
  }
  return originalPropertyValues;
};

const collectPseudoStates = (
  selector: string,
  properties: readonly string[],
  alreadyFrozen?: Map<HTMLElement, Map<string, string>>,
): FrozenPseudoState[] => {
  const elementsToFreeze: FrozenPseudoState[] = [];

  for (const element of document.querySelectorAll(selector)) {
    if (!(element instanceof HTMLElement)) continue;
    if (alreadyFrozen?.has(element)) continue;

    const computed = getComputedStyle(element);
    let frozenStyles = element.style.cssText;
    const originalPropertyValues = collectOriginalPropertyValues(
      element,
      properties,
    );

    for (const prop of properties) {
      const computedValue = computed.getPropertyValue(prop);
      if (computedValue) {
        frozenStyles += `${prop}: ${computedValue} !important; `;
      }
    }

    elementsToFreeze.push({ element, frozenStyles, originalPropertyValues });
  }

  return elementsToFreeze;
};

const applyFrozenStates = (
  states: FrozenPseudoState[],
  storageMap: Map<HTMLElement, Map<string, string>>,
): void => {
  for (const { element, frozenStyles, originalPropertyValues } of states) {
    storageMap.set(element, originalPropertyValues);
    element.style.cssText = frozenStyles;
  }
};

const restoreFrozenStates = (
  storageMap: Map<HTMLElement, Map<string, string>>,
  styleProperties: readonly string[],
): void => {
  for (const [element, originalPropertyValues] of storageMap) {
    for (const prop of styleProperties) {
      const originalValue = originalPropertyValues.get(prop);
      if (originalValue) {
        element.style.setProperty(prop, originalValue);
      } else {
        element.style.removeProperty(prop);
      }
    }
  }
  storageMap.clear();
};

export const suspendPointerEventsFreeze = (): void => {
  if (pointerEventsStyle) pointerEventsStyle.disabled = true;
};

export const resumePointerEventsFreeze = (): void => {
  if (pointerEventsStyle) pointerEventsStyle.disabled = false;
};

export const freezePseudoStates = (): void => {
  if (pointerEventsStyle) return;

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, stopEvent, true);
  }

  for (const eventType of FOCUS_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, preventFocusChange, true);
  }

  const hoverStates = collectPseudoStates(":hover", HOVER_STYLE_PROPERTIES);
  const focusStates = collectPseudoStates(
    ":focus, :focus-visible",
    FOCUS_STYLE_PROPERTIES,
    frozenFocusElements,
  );

  applyFrozenStates(hoverStates, frozenHoverElements);
  applyFrozenStates(focusStates, frozenFocusElements);

  pointerEventsStyle = createStyleElement(
    "data-react-grab-frozen-pseudo",
    POINTER_EVENTS_STYLES,
  );
};

export const unfreezePseudoStates = (): void => {
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
