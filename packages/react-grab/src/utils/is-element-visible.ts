export const isElementVisible = (
  element: Element,
  computedStyle: CSSStyleDeclaration = window.getComputedStyle(element),
) => {
  return (
    computedStyle.display !== "none" &&
    computedStyle.visibility !== "hidden" &&
    computedStyle.opacity !== "0"
  );
};
