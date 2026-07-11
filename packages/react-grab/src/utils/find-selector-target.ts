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

export const findSelectorTarget = (element: Element): Element =>
  element.closest(SELECTOR_TARGET_QUERY) ?? element;
