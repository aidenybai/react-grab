import { getComposedParentElement } from "./get-composed-parent-element.js";
import { getElementAdapter } from "./element-adapter.js";

export const isElementWithinContainer = (element: Element, container: Element): boolean => {
  let currentElement: Element | null = getElementAdapter(element)?.physicalElement ?? element;
  while (currentElement) {
    if (currentElement === container) return true;
    currentElement = getComposedParentElement(currentElement);
  }
  return false;
};
