import { BROAD_SELECTOR_TARGET_DESCENDANT_RATIO } from "../constants.js";
import { ACTIONABLE_SELECTOR_ROLES } from "./actionable-selector-roles.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";
import { isStableElementId } from "./is-stable-element-id.js";
import { PREFERRED_SELECTOR_ATTRIBUTE_NAMES } from "./preferred-selector-attribute-names.js";

const SELECTOR_IDENTIFIER_QUERY = [
  ...Array.from(PREFERRED_SELECTOR_ATTRIBUTE_NAMES)
    .filter((attributeName) => attributeName !== "role")
    .map((attributeName) => `[${attributeName}]`),
  ...Array.from(ACTIONABLE_SELECTOR_ROLES).map((role) => `[role~="${role}"]`),
].join(",");

const GENERIC_SELECTOR_TARGET_QUERY = ["button", "input", "select", "textarea"].join(",");

const hasSelectorIdentifier = (element: Element): boolean => {
  const elementId = element.getAttribute("id");
  return Boolean(
    (elementId && isStableElementId(elementId)) || element.matches(SELECTOR_IDENTIFIER_QUERY),
  );
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
  const selectorRoot = element.getRootNode();
  let currentElement: Element | null = element;
  while (currentElement) {
    const currentElementIsSelectorTarget = isSelectorTarget(currentElement);
    const currentElementIsBroadTarget =
      currentElementIsSelectorTarget && isBroadSelectorTarget(currentElement);

    if (currentElementIsSelectorTarget) {
      if (currentElementIsBroadTarget && currentElement !== element) return element;
      if (!isCandidateAccepted || isCandidateAccepted(currentElement)) return currentElement;
      if (currentElementIsBroadTarget) return currentElement;
      if (!hasSelectorIdentifier(currentElement) && currentElement === element)
        return currentElement;
    }
    const parentElement = getComposedParentElement(currentElement);
    currentElement = parentElement?.getRootNode() === selectorRoot ? parentElement : null;
  }
  return element;
};
