export const isElementVisible = (
  element: Element,
  computedStyle: CSSStyleDeclaration = window.getComputedStyle(element),
): boolean => {
  return (
    computedStyle.display !== "none" &&
    computedStyle.visibility !== "hidden" &&
    computedStyle.opacity !== "0"
  );
};
