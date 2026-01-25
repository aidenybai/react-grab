import { IGNORE_EVENTS_ATTRIBUTE } from "../constants.js";
import { isElementVisible } from "./is-element-visible.js";
import { ATTRIBUTE_NAME } from "./mount-root.js";

const REACT_GRAB_SELECTOR = `[${ATTRIBUTE_NAME}], [${IGNORE_EVENTS_ATTRIBUTE}]`;

export const isValidGrabbableElement = (element: Element): boolean => {
  if (element.closest(REACT_GRAB_SELECTOR)) {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  if (!isElementVisible(element, computedStyle)) {
    return false;
  }

  return true;
};
