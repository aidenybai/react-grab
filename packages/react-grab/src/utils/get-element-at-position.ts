import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

export const getElementAtPosition = (
  clientX: number,
  clientY: number,
): Element | null => {
  let element = document.elementFromPoint(clientX, clientY);

  while (element) {
    if (isValidGrabbableElement(element)) {
      return element;
    }
    element = element.parentElement;
  }

  return null;
};
