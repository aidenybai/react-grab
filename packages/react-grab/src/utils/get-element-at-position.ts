import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

let overrideStyle: HTMLStyleElement | null = null;

export const enablePointerEventsOverride = (): void => {
  if (overrideStyle) return;
  overrideStyle = document.createElement("style");
  overrideStyle.textContent = "* { pointer-events: auto !important; }";
  document.head.appendChild(overrideStyle);
};

export const disablePointerEventsOverride = (): void => {
  if (!overrideStyle) return;
  overrideStyle.remove();
  overrideStyle = null;
};

export const getElementAtPosition = (
  clientX: number,
  clientY: number,
): Element | null => {
  enablePointerEventsOverride();
  let elementsAtPoint: Element[];
  try {
    elementsAtPoint = document.elementsFromPoint(clientX, clientY);
  } finally {
    disablePointerEventsOverride();
  }

  for (const candidateElement of elementsAtPoint) {
    if (isValidGrabbableElement(candidateElement)) {
      return candidateElement;
    }
  }

  return null;
};
