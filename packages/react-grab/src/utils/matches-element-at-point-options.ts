import type { ElementAtPointOptions } from "../types.js";
import { isElementWithinContainer } from "./is-element-within-container.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

export const matchesElementAtPointOptions = (
  element: Element,
  options: ElementAtPointOptions | undefined,
): boolean => {
  if (options?.container && !isElementWithinContainer(element, options.container)) return false;
  return (options?.filter ?? isValidGrabbableElement)(element);
};
