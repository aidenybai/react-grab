import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import {
  enablePointerEventsOverride,
  disablePointerEventsOverride,
} from "./pointer-events-override.js";

export const getElementsAtPoint = (
  clientX: number,
  clientY: number,
): Element[] => {
  enablePointerEventsOverride();
  try {
    return document.elementsFromPoint(clientX, clientY);
  } finally {
    disablePointerEventsOverride();
  }
};

export const getElementsAbove = (element: Element): Element[] => {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const elementsAtPoint = getElementsAtPoint(centerX, centerY);
  const elementIndex = elementsAtPoint.indexOf(element);

  if (elementIndex === -1) return [];

  return elementsAtPoint.slice(0, elementIndex);
};

export const getElementAtPosition = (
  clientX: number,
  clientY: number,
): Element | null => {
  const elementsAtPoint = getElementsAtPoint(clientX, clientY);

  for (const candidateElement of elementsAtPoint) {
    if (isValidGrabbableElement(candidateElement)) {
      return candidateElement;
    }
  }

  return null;
};
