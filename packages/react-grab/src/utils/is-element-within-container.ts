import { getComposedParentElement } from "./get-composed-parent-element.js";

export const isElementWithinContainer = (element: Element, container: Element): boolean => {
  let currentElement: Element | null = element;
  while (currentElement) {
    if (currentElement === container) return true;
    currentElement = getComposedParentElement(currentElement);
  }
  return false;
};
