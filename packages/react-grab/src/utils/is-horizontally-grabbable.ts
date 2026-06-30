import { MIN_HORIZONTAL_NAV_SIZE_PX } from "../constants.js";

const isSvgInternal = (element: Element): boolean =>
  element instanceof SVGElement && !(element instanceof SVGSVGElement);

const hasMeaningfulSize = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_HORIZONTAL_NAV_SIZE_PX || rect.height >= MIN_HORIZONTAL_NAV_SIZE_PX;
};

// A sibling is reachable by ArrowLeft/ArrowRight (and therefore shown as a
// sibling row in the hierarchy tree) only when it is grabbable, not an internal
// SVG node, and large enough to target. Vertical/ancestor/child navigation uses
// the looser grabbable check, so this is shared to keep the two in sync.
export const isHorizontallyGrabbable = (
  element: Element,
  isValidGrabbableElement: (element: Element) => boolean,
): boolean =>
  isValidGrabbableElement(element) && !isSvgInternal(element) && hasMeaningfulSize(element);
