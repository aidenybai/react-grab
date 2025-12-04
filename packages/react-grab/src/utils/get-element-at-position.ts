import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

export const getElementAtPosition = (
  clientX: number,
  clientY: number,
): Element | null => {
  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);

  for (const candidateElement of elementsAtPoint) {
    if (isValidGrabbableElement(candidateElement)) {
      return candidateElement;
    }
  }

  return null;
};
