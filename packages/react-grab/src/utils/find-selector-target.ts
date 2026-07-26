import { BROAD_SELECTOR_TARGET_DESCENDANT_RATIO } from "../constants.js";
import { isStableElementId } from "./is-stable-element-id.js";
import { PREFERRED_SELECTOR_ATTRIBUTE_NAMES } from "./preferred-selector-attribute-names.js";

const GENERIC_SELECTOR_TARGET_QUERY = ["button", "input", "select", "textarea"].join(",");

const hasSelectorIdentifier = (element: Element): boolean => {
  const elementId = element.getAttribute("id");
  if (elementId && isStableElementId(elementId)) return true;
  for (const attributeName of PREFERRED_SELECTOR_ATTRIBUTE_NAMES) {
    if (element.hasAttribute(attributeName)) return true;
  }
  return false;
};

const isSelectorTarget = (element: Element): boolean =>
  hasSelectorIdentifier(element) || element.matches(GENERIC_SELECTOR_TARGET_QUERY);

const isBroadSelectorTarget = (element: Element): boolean => {
  const { body, documentElement } = element.ownerDocument;
  if (element === body || element === documentElement) return true;
  if (!body) return false;

  const bodyDescendantCount = body.getElementsByTagName("*").length;
  if (bodyDescendantCount === 0) return false;

  const elementDescendantCount = element.getElementsByTagName("*").length;
  return elementDescendantCount / bodyDescendantCount >= BROAD_SELECTOR_TARGET_DESCENDANT_RATIO;
};

export const findSelectorTarget = (
  element: Element,
  isCandidateAccepted?: (candidate: Element) => boolean,
): Element => {
  let currentElement: Element | null = element;
  while (currentElement) {
    const currentElementIsSelectorTarget = isSelectorTarget(currentElement);
    const currentElementIsBroadTarget =
      currentElementIsSelectorTarget && isBroadSelectorTarget(currentElement);

    if (currentElementIsBroadTarget && currentElement !== element) return element;
    if (isCandidateAccepted?.(currentElement)) return currentElement;

    if (currentElementIsSelectorTarget) {
      if (!isCandidateAccepted || currentElementIsBroadTarget) return currentElement;
      if (!hasSelectorIdentifier(currentElement)) return currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  return element;
};
