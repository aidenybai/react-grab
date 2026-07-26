import { BROAD_SELECTOR_TARGET_DESCENDANT_RATIO } from "../constants.js";
import { isStableElementId } from "./is-stable-element-id.js";

const SELECTOR_TARGET_QUERY = [
  "[data-testid]",
  "[data-test-id]",
  "[data-test]",
  "[data-cy]",
  "[data-qa]",
  "[aria-label]",
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
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

const isSelectorTarget = (element: Element): boolean => {
  const elementId = element.getAttribute("id");
  return Boolean(
    (elementId && isStableElementId(elementId)) || element.matches(SELECTOR_TARGET_QUERY),
  );
};

const isBroadSelectorTarget = (element: Element): boolean => {
  const { body, documentElement } = element.ownerDocument;
  if (element === body || element === documentElement) return true;
  if (!body) return false;

  const bodyDescendantCount = body.getElementsByTagName("*").length;
  if (bodyDescendantCount === 0) return false;

  const elementDescendantCount = element.getElementsByTagName("*").length;
  return elementDescendantCount / bodyDescendantCount >= BROAD_SELECTOR_TARGET_DESCENDANT_RATIO;
};

export const findSelectorTarget = (element: Element): Element => {
  let currentElement: Element | null = element;
  while (currentElement) {
    if (isSelectorTarget(currentElement)) {
      return isBroadSelectorTarget(currentElement) ? element : currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  return element;
};
