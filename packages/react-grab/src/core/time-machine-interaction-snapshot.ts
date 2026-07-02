// Hover/focus/active visuals can only be read while the pseudo-class is
// genuinely active, so each timeline entry captures them at record time —
// the moment the interaction actually happened — as computed-value pins.
// While rewound, the pins of the current entry are applied as !important
// inline styles (the same technique freeze-pseudo-states uses for the grab
// freeze), so a button that was hovered when a change was recorded lights up
// again when you scrub back to that moment. Focus is never actually moved
// and no synthetic events fire; this is purely visual.
import { TIME_MACHINE_MAX_INTERACTION_ELEMENTS } from "../constants.js";
import {
  collectFocusedElements,
  FOCUS_STYLE_PROPERTIES,
  HOVER_STYLE_PROPERTIES,
} from "../utils/freeze-pseudo-states.js";
import { REACT_GRAB_ATTRIBUTE_NAME } from "../utils/react-grab-attribute-name.js";

interface InteractionStylePin {
  elementRef: WeakRef<HTMLElement>;
  properties: readonly string[];
  computedValues: string[];
}

export interface TimeMachineInteractionSnapshot {
  pins: InteractionStylePin[];
}

interface AppliedPinRecord {
  element: HTMLElement;
  property: string;
  pinnedValue: string;
  originalValue: string;
  originalPriority: string;
}

let appliedPinRecords: AppliedPinRecord[] = [];

const isOverlayElement = (element: HTMLElement): boolean =>
  element.hasAttribute(REACT_GRAB_ATTRIBUTE_NAME);

const collectPseudoClassElements = (pseudoClassSelector: string): HTMLElement[] => {
  try {
    return Array.from(document.querySelectorAll(pseudoClassSelector)).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && !isOverlayElement(element),
    );
  } catch {
    return [];
  }
};

const captureElementPin = (
  element: HTMLElement,
  properties: readonly string[],
): InteractionStylePin => {
  const computed = getComputedStyle(element);
  const computedValues: string[] = [];
  for (const property of properties) {
    computedValues.push(computed.getPropertyValue(property));
  }
  return { elementRef: new WeakRef(element), properties, computedValues };
};

// READ phase per recorded commit: getComputedStyle flushes styles, but only
// for the handful of elements in the hover/focus/active chains, and a flush
// was imminent anyway for the just-committed frame to paint.
export const captureInteractionSnapshot = (): TimeMachineInteractionSnapshot | null => {
  const pins: InteractionStylePin[] = [];
  const pinnedElements = new Set<HTMLElement>();

  const capture = (elements: HTMLElement[], properties: readonly string[]) => {
    for (const element of elements) {
      if (pins.length >= TIME_MACHINE_MAX_INTERACTION_ELEMENTS) return;
      if (pinnedElements.has(element)) continue;
      pinnedElements.add(element);
      pins.push(captureElementPin(element, properties));
    }
  };

  capture(collectPseudoClassElements(":active"), HOVER_STYLE_PROPERTIES);
  capture(collectPseudoClassElements(":hover"), HOVER_STYLE_PROPERTIES);
  capture(
    collectFocusedElements().filter((element) => !isOverlayElement(element)),
    FOCUS_STYLE_PROPERTIES,
  );

  return pins.length > 0 ? { pins } : null;
};

// A pin is only unwound when it still owns the property — travel re-renders
// may legitimately overwrite inline styles while rewound, and restoring on
// top of those would clobber newer app-authored values.
const unpinRecord = (record: AppliedPinRecord): void => {
  const { element, property } = record;
  if (
    element.style.getPropertyValue(property) !== record.pinnedValue ||
    element.style.getPropertyPriority(property) !== "important"
  ) {
    return;
  }
  if (record.originalValue) {
    element.style.setProperty(property, record.originalValue, record.originalPriority);
  } else {
    element.style.removeProperty(property);
  }
};

export const releaseInteractionPins = (): void => {
  for (const record of appliedPinRecords) {
    unpinRecord(record);
  }
  appliedPinRecords = [];
};

// Swaps the applied pins to the given entry's snapshot (or clears them for
// null, e.g. the position before the first recorded change).
export const applyInteractionSnapshot = (snapshot: TimeMachineInteractionSnapshot | null): void => {
  releaseInteractionPins();
  if (!snapshot) return;

  for (const pin of snapshot.pins) {
    const element = pin.elementRef.deref();
    if (!element || !element.isConnected) continue;
    for (let propertyIndex = 0; propertyIndex < pin.properties.length; propertyIndex++) {
      const property = pin.properties[propertyIndex];
      const pinnedValue = pin.computedValues[propertyIndex];
      if (!pinnedValue) continue;
      appliedPinRecords.push({
        element,
        property,
        pinnedValue,
        originalValue: element.style.getPropertyValue(property),
        originalPriority: element.style.getPropertyPriority(property),
      });
      element.style.setProperty(property, pinnedValue, "important");
    }
  }
};
