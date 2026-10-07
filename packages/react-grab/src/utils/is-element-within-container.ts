import { getComposedParentElement } from "./get-composed-parent-element.js";
import { getElementAdapter } from "../core/element-adapter.js";

export const isElementWithinContainer = (element: Element, container: Element): boolean => {
  let currentElement: Element | null = getElementAdapter(element)?.hostElement ?? element;
  while (currentElement) {
    if (currentElement === container) return true;
    currentElement = getComposedParentElement(currentElement);
  }
  return false;
};
