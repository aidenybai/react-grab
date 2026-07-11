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
  "[role]",
].join(",");

export const findSelectorTarget = (element: Element): Element =>
  element.closest(SELECTOR_TARGET_QUERY) ?? element;
