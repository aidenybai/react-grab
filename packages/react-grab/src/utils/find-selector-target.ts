import { BROAD_SELECTOR_TARGET_DESCENDANT_RATIO } from "../constants.js";
import { isStableElementId } from "./is-stable-element-id.js";

const SELECTOR_IDENTIFIER_QUERY = [
  "[data-testid]",
  "[data-test-id]",
  "[data-test]",
  "[data-cy]",
  "[data-qa]",
  "[aria-label]",
  "a[href]",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
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

const acceptAnySelectorTarget = (): boolean => true;

export const findSelectorTarget = (
  element: Element,
  isCandidateAccepted: (candidate: Element) => boolean = acceptAnySelectorTarget,
): Element => {
  let currentElement: Element | null = element;
  while (currentElement) {
    if (isSelectorTarget(currentElement)) {
      if (isBroadSelectorTarget(currentElement)) return element;
      if (isCandidateAccepted(currentElement)) return currentElement;
      if (!hasSelectorIdentifier(currentElement)) return currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  return element;
};
