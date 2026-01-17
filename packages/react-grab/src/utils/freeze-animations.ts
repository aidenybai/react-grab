import { FROZEN_ELEMENT_ATTRIBUTE } from "../constants.js";

const FROZEN_STYLES = `
[${FROZEN_ELEMENT_ATTRIBUTE}],
[${FROZEN_ELEMENT_ATTRIBUTE}] * {
  animation-play-state: paused !important;
}
`;

let styleElement: HTMLStyleElement | null = null;

const ensureStylesInjected = (): void => {
  if (styleElement) return;

  styleElement = document.createElement("style");
  styleElement.setAttribute("data-react-grab-frozen-styles", "");
  styleElement.textContent = FROZEN_STYLES;
  document.head.appendChild(styleElement);
};

export const freezeAnimations = (elements: Element[]): (() => void) => {
  if (elements.length === 0) return () => {};

  ensureStylesInjected();

  for (const element of elements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");
  }

  return () => {
    for (const element of elements) {
      element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
    }
  };
};
