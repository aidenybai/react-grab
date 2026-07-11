import { BROAD_SELECTOR_TARGET_DESCENDANT_RATIO } from "../constants.js";

const SELECTOR_TARGET_QUERY = [
  "[id]",
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
  const selectorTarget = element.closest(SELECTOR_TARGET_QUERY);
  if (!selectorTarget || isBroadSelectorTarget(selectorTarget)) return element;
  return selectorTarget;
};
