import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

export const getGrabbableElementFromTarget = (
  target: EventTarget | null,
): Element | null => {
  if (!(target instanceof Element)) return null;

  let current: Element | null = target;
  while (current) {
    if (isValidGrabbableElement(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};
