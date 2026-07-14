import { clearElementPositionCache } from "./get-element-at-position.js";
import { IS_DEMO } from "./runtime-mode.js";
import {
  installPointerEventsFreeze,
  isPointerEventsFreezeInstalled,
  uninstallPointerEventsFreeze,
} from "./pointer-events-freeze.js";
import { throwCollectedErrors } from "./throw-collected-errors.js";

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
// display is pinned so hover-revealed dropdowns/tooltips under the cursor
// (display:none until :hover) stay open once the freeze drops :hover.
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
  "display",
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
  frozenPropertyValues: Map<string, string>;
  originalPropertyValues: Map<string, InlineStyleProperty>;
}

interface InlineStyleProperty {
  value: string;
  priority: string;
}

const frozenHoverElements = new Map<HTMLElement, Map<string, InlineStyleProperty>>();
const frozenFocusElements = new Map<HTMLElement, Map<string, InlineStyleProperty>>();

const stopEvent = (event: Event): void => {
  event.stopImmediatePropagation();
};

const preventFocusChange = (event: Event): void => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

const freezeElement = (
  element: HTMLElement,
  properties: readonly string[],
  alreadyFrozen?: ReadonlyMap<HTMLElement, unknown>,
): FrozenPseudoState | null => {
  if (alreadyFrozen?.has(element)) return null;

  const computed = getComputedStyle(element);
  const frozenPropertyValues = new Map<string, string>();
  const originalPropertyValues = new Map<string, InlineStyleProperty>();

  for (const property of properties) {
    const computedValue = computed.getPropertyValue(property);
    if (computedValue) {
      frozenPropertyValues.set(property, computedValue);
      originalPropertyValues.set(property, {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      });
    }
  }

  return { element, frozenPropertyValues, originalPropertyValues };
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
  storageMap: Map<HTMLElement, Map<string, InlineStyleProperty>>,
): void => {
  for (const { element, frozenPropertyValues, originalPropertyValues } of states) {
    storageMap.set(element, originalPropertyValues);
    for (const [property, value] of frozenPropertyValues) {
      element.style.setProperty(property, value, "important");
    }
  }
};

const restoreFrozenStates = (
  storageMap: Map<HTMLElement, Map<string, InlineStyleProperty>>,
): unknown[] => {
  const cleanupErrors: unknown[] = [];
  for (const [element, originalPropertyValues] of storageMap) {
    for (const [property, originalProperty] of originalPropertyValues) {
      try {
        if (originalProperty.value) {
          element.style.setProperty(property, originalProperty.value, originalProperty.priority);
        } else {
          element.style.removeProperty(property);
        }
        originalPropertyValues.delete(property);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (originalPropertyValues.size === 0) storageMap.delete(element);
  }
  return cleanupErrors;
};

interface PseudoFreezeSnapshot {
  hoverStates: FrozenPseudoState[];
  focusStates: FrozenPseudoState[];
}

// READ phase. collectHoveredElements (elementFromPoint) and freezeElement
// (getComputedStyle) force layout/style flushes, so the caller must run this
// before any freeze-related DOM writes to avoid a second forced recalc.
export const collectPseudoStates = (
  cursorX?: number,
  cursorY?: number,
): PseudoFreezeSnapshot | null => {
  // Demo mode is display-only and must never freeze (or force a style flush
  // on) the host page. applyPseudoStates bails on the null snapshot.
  if (IS_DEMO) return null;
  if (isPointerEventsFreezeInstalled()) return null;

  const hoverStates: FrozenPseudoState[] = [];
  const isCursorInViewport =
    cursorX !== undefined &&
    cursorY !== undefined &&
    cursorX >= 0 &&
    cursorY >= 0 &&
    cursorX < window.innerWidth &&
    cursorY < window.innerHeight;
  const hoveredElements = isCursorInViewport
    ? collectHoveredElements(cursorX, cursorY)
    : Array.from(document.querySelectorAll(":hover")).filter(
        (element): element is HTMLElement => element instanceof HTMLElement,
      );
  for (const element of hoveredElements) {
    const state = freezeElement(element, HOVER_STYLE_PROPERTIES);
    if (state) hoverStates.push(state);
  }

  const focusStates: FrozenPseudoState[] = [];
  for (const element of collectFocusedElements()) {
    const state = freezeElement(element, FOCUS_STYLE_PROPERTIES, frozenFocusElements);
    if (state) focusStates.push(state);
  }

  return { hoverStates, focusStates };
};

// WRITE phase. Event blockers + inline-style pins + pointer-events stylesheet —
// no layout reads, so it never forces a recalc on its own.
export const applyPseudoStates = (snapshot: PseudoFreezeSnapshot | null): void => {
  if (!snapshot) return;

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, stopEvent, true);
  }

  for (const eventType of FOCUS_EVENTS_TO_BLOCK) {
    document.addEventListener(eventType, preventFocusChange, true);
  }

  applyFrozenStates(snapshot.hoverStates, frozenHoverElements);
  applyFrozenStates(snapshot.focusStates, frozenFocusElements);

  installPointerEventsFreeze();
};

export const unfreezePseudoStates = (): void => {
  clearElementPositionCache();

  for (const eventType of MOUSE_EVENTS_TO_BLOCK) {
    document.removeEventListener(eventType, stopEvent, true);
  }

  for (const eventType of FOCUS_EVENTS_TO_BLOCK) {
    document.removeEventListener(eventType, preventFocusChange, true);
  }

  const cleanupErrors = [
    ...restoreFrozenStates(frozenHoverElements),
    ...restoreFrozenStates(frozenFocusElements),
  ];

  try {
    uninstallPointerEventsFreeze();
  } catch (error) {
    cleanupErrors.push(error);
  }
  throwCollectedErrors(cleanupErrors, "Unfreezing pseudo states failed");
};
