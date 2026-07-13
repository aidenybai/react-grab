import { USER_IGNORE_ATTRIBUTE } from "../constants.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";

export const isUserIgnoredElement = (element: Element): boolean => {
  let currentElement: Element | null = element;
  while (currentElement) {
    if (currentElement.hasAttribute(USER_IGNORE_ATTRIBUTE)) return true;
    currentElement = getComposedParentElement(currentElement);
  }
  return false;
};
