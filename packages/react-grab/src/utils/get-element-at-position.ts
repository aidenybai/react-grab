import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { ATTRIBUTE_NAME } from "./mount-root.js";

let cachedOverlay: HTMLElement | null = null;

export const getElementAtPosition = (
  clientX: number,
  clientY: number,
): Element | null => {
  if (!cachedOverlay || !cachedOverlay.isConnected) {
    cachedOverlay = document.querySelector(`[${ATTRIBUTE_NAME}]`);
  }

  const savedPointerEvents = cachedOverlay?.style.pointerEvents;
  if (cachedOverlay) {
    cachedOverlay.style.pointerEvents = "none";
  }

  let element = document.elementFromPoint(clientX, clientY);

  if (cachedOverlay) {
    cachedOverlay.style.pointerEvents = savedPointerEvents ?? "";
  }

  while (element) {
    if (isValidGrabbableElement(element)) {
      return element;
    }
    element = element.parentElement;
  }

  return null;
};
