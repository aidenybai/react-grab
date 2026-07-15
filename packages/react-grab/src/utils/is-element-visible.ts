import { getElementComputedStyle } from "./get-element-computed-style.js";

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

const STRUCTURAL_VISIBILITY_OPTIONS = {
  checkVisibilityCSS: true,
  visibilityProperty: true,
};

export const isElementVisible = (
  element: Element,
  computedStyle?: CSSStyleDeclaration,
): boolean => {
  if (supportsCheckVisibility && !computedStyle) {
    if (element.checkVisibility(CHECK_VISIBILITY_OPTIONS)) return true;
    if (!element.checkVisibility(STRUCTURAL_VISIBILITY_OPTIONS)) return false;
    // Only an opacity:0 somewhere in the ancestor chain remains. An ancestor's
    // opacity is NOT a reliable invisibility signal while react-grab is active:
    // the pointer-events freeze suppresses :hover, so hover-revealed UI
    // (opacity-0 row toolbars revealed by .row:hover) reads opacity:0 for the
    // whole session and would become unreachable. Match the element's own
    // opacity only - hit-testability decides the rest.
    return getElementComputedStyle(element).opacity !== "0";
  }
  const style = computedStyle ?? getElementComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
};
