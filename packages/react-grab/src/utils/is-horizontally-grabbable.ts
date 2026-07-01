import { MIN_HORIZONTAL_NAV_SIZE_PX } from "../constants.js";
import type { ElementPredicate } from "../types.js";

const isSvgInternal = (element: Element): boolean =>
  element instanceof SVGElement && !(element instanceof SVGSVGElement);

const hasMeaningfulSize = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_HORIZONTAL_NAV_SIZE_PX || rect.height >= MIN_HORIZONTAL_NAV_SIZE_PX;
};

// A sibling is reachable by ArrowLeft/ArrowRight (and therefore shown as a
// sibling row in the hierarchy tree) only when it is grabbable, not an internal
// SVG node, and large enough to target. Vertical/ancestor/child navigation uses
// the looser grabbable check. Core composes this with its grabbable predicate
// exactly once and hands the result to both the arrow navigator and the
// hierarchy builder so the two can never diverge.
export const isHorizontallyGrabbable = (
  element: Element,
  isValidGrabbableElement: ElementPredicate,
): boolean =>
  isValidGrabbableElement(element) && !isSvgInternal(element) && hasMeaningfulSize(element);
