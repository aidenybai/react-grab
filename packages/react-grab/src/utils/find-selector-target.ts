const SELECTOR_TARGET_QUERIES = [
  "[data-testid],[data-test-id],[data-test],[data-cy],[data-qa]",
  "[aria-label]",
  "a[href]",
  "button,input,select,textarea",
  "[role]",
];

export const findSelectorTarget = (element: Element): Element => {
  for (const selectorTargetQuery of SELECTOR_TARGET_QUERIES) {
    const selectorTarget = element.closest(selectorTargetQuery);
    if (selectorTarget) return selectorTarget;
  }
  return element;
};
