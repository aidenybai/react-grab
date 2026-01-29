import { FROZEN_ELEMENT_ATTRIBUTE } from "../constants.js";

export {
  freezePseudoStates,
  unfreezePseudoStates,
} from "./freeze-pseudo-states.js";

const FROZEN_STYLES = `
[${FROZEN_ELEMENT_ATTRIBUTE}],
[${FROZEN_ELEMENT_ATTRIBUTE}] * {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

const GLOBAL_FREEZE_STYLES = `
*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let lastInputElements: Element[] = [];

let globalAnimationStyleElement: HTMLStyleElement | null = null;

const createStyleElement = (
  attribute: string,
  content: string,
): HTMLStyleElement => {
  const element = document.createElement("style");
  element.setAttribute(attribute, "");
  element.textContent = content;
  document.head.appendChild(element);
  return element;
};

const ensureStylesInjected = (): void => {
  if (styleElement) return;
  styleElement = createStyleElement(
    "data-react-grab-frozen-styles",
    FROZEN_STYLES,
  );
};

const areElementsSame = (a: Element[], b: Element[]): boolean =>
  a.length === b.length && a.every((element, index) => element === b[index]);

export const freezeAllAnimations = (elements: Element[]): void => {
  if (elements.length === 0) return;
  if (areElementsSame(elements, lastInputElements)) return;

  lastInputElements = [...elements];
  unfreezeAllAnimations();
  ensureStylesInjected();
  frozenElements = elements;

  for (const element of frozenElements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");
  }
};

export const unfreezeAllAnimations = (): void => {
  if (frozenElements.length === 0) return;

  for (const element of frozenElements) {
    element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
  }

  frozenElements = [];
  lastInputElements = [];
};

export const freezeAnimations = (elements: Element[]): (() => void) => {
  if (elements.length === 0) {
    unfreezeAllAnimations();
    return () => {};
  }

  freezeAllAnimations(elements);
  return unfreezeAllAnimations;
};

export const freezeGlobalAnimations = (): void => {
  if (globalAnimationStyleElement) return;

  globalAnimationStyleElement = createStyleElement(
    "data-react-grab-global-freeze",
    GLOBAL_FREEZE_STYLES,
  );
};

export const unfreezeGlobalAnimations = (): void => {
  globalAnimationStyleElement?.remove();
  globalAnimationStyleElement = null;
};
