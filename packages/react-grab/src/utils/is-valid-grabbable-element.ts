import { isElementVisible } from "./is-element-visible.js";
import { ATTRIBUTE_NAME } from "./mount-root.js";

export const isValidGrabbableElement = (element: Element): boolean => {
  if (element.closest(`[${ATTRIBUTE_NAME}]`)) {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  if (!isElementVisible(element, computedStyle)) {
    return false;
  }

  if (computedStyle.pointerEvents === "none") {
    return false;
  }

  return true;
};
