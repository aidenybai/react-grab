import { clearElementPositionCache } from "./get-element-at-position.js";
import { createStyleElement } from "./create-style-element.js";

// We apply pointer-events:none on `html` rather than `*` because pointer-events
// is inherited, so toggling it on a single root element is O(1) style invalidation
// instead of O(N) for every DOM node, which caused visible lag on dense DOMs
// like GitHub diff viewers with 10k+ nodes.
// @see https://github.com/aidenybai/react-grab/pull/209
const POINTER_EVENTS_STYLES = "html { pointer-events: none !important; }";

// These capture-phase blockers prevent hover and focus side effects while the
// pointer-events freeze is briefly suspended for hit-testing. Even though the
// stylesheet is disabled, these listeners swallow events the browser would fire.
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

// Before disabling pointer-events we snapshot current :hover and :focus computed
// values (background-color, box-shadow, opacity, etc.) onto inline styles so
// elements keep their visual state (e.g. a hovered button stays highlighted).
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

const freezeElement = (
  element: HTMLElement,
  properties: readonly string[],
  alreadyFrozen?: Map<HTMLElement, Map<string, string>>,
): FrozenPseudoState | null => {
  if (alreadyFrozen?.has(element)) return null;

  const computed = getComputedStyle(element);
  let frozenStyles = element.style.cssText;
  const originalPropertyValues = collectOriginalPropertyValues(element, properties);

  for (const prop of properties) {
    const computedValue = computed.getPropertyValue(prop);
    if (computedValue) {
      frozenStyles += `${prop}: ${computedValue} !important; `;
    }
  }

  return { element, frozenStyles, originalPropertyValues };
};

const collectHoveredElements = (cursorX: number, cursorY: number): HTMLElement[] => {
  const hoveredElements: HTMLElement[] = [];
  let current = document.elementFromPoint(cursorX, cursorY);
  while (current && current !== document.documentElement) {
    if (current instanceof HTMLElement) {
      hoveredElements.push(current);
    }
    current = current.parentElement;
  }
  return hoveredElements;
};

const collectFocusedElements = (): HTMLElement[] => {
  const focusedElements: HTMLElement[] = [];
  let current: Element | null = document.activeElement;
  while (current && current !== document.body) {
    if (current instanceof HTMLElement) {
      focusedElements.push(current);
    }
    const shadowRoot = current.shadowRoot;
    current = shadowRoot?.activeElement ?? null;
  }
  return focusedElements;
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

export const freezePseudoStates = (cursorX: number, cursorY: number): void => {
  if (pointerEventsStyle) return;

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, stopEvent, true);
  }

  for (const eventType of FOCUS_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, preventFocusChange, true);
  }

  const hoverStates: FrozenPseudoState[] = [];
  for (const element of collectHoveredElements(cursorX, cursorY)) {
    const state = freezeElement(element, HOVER_STYLE_PROPERTIES);
    if (state) hoverStates.push(state);
  }

  const focusStates: FrozenPseudoState[] = [];
  for (const element of collectFocusedElements()) {
    const state = freezeElement(element, FOCUS_STYLE_PROPERTIES, frozenFocusElements);
    if (state) focusStates.push(state);
  }

  applyFrozenStates(hoverStates, frozenHoverElements);
  applyFrozenStates(focusStates, frozenFocusElements);

  pointerEventsStyle = createStyleElement("data-react-grab-frozen-pseudo", POINTER_EVENTS_STYLES);
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
