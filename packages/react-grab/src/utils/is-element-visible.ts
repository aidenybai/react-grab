// checkVisibility avoids materializing a CSSStyleDeclaration per element,
// which dominated drag-selection profiles on dense DOMs (~35% of self time).
// Both option spellings are passed: Chrome <108 only understands
// checkOpacity/checkVisibilityCSS, newer engines use the *Property names.
const supportsCheckVisibility =
  typeof Element !== "undefined" && typeof Element.prototype.checkVisibility === "function";

const CHECK_VISIBILITY_OPTIONS = {
  checkOpacity: true,
  checkVisibilityCSS: true,
  opacityProperty: true,
  visibilityProperty: true,
};

export const isElementVisible = (
  element: Element,
  computedStyle?: CSSStyleDeclaration,
): boolean => {
  if (supportsCheckVisibility && !computedStyle) {
    return element.checkVisibility(CHECK_VISIBILITY_OPTIONS);
  }
  const style = computedStyle ?? window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
};
