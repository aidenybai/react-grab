import { REGION_INK_OVERFLOW_MARGIN_PX } from "../constants";
import type { CaptureRegionRect } from "../types";
import { computeAutoBleed } from "./compute-auto-bleed";
import { getComposedChildNodes } from "./get-composed-child-nodes";
import { isElementNode } from "./is-element-node";

interface SubtreeExtent {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Hollowing keeps the element's own pinned box but drops its children; boxes
// whose used size the capture cannot pin inline (non-replaced inlines, table
// internals, ruby, display: contents) would collapse and shift in-region
// layout, so they are never hollowed.
const isHollowSafeDisplay = (display: string): boolean =>
  display !== "inline" &&
  display !== "contents" &&
  !display.startsWith("table") &&
  !display.startsWith("ruby") &&
  !display.startsWith("inline-table");

const computeElementPaintBleed = (
  element: Element,
  defaultView: Window & typeof globalThis,
): number => {
  const computedStyle = defaultView.getComputedStyle(element);
  const bleed = computeAutoBleed({
    "box-shadow": computedStyle.getPropertyValue("box-shadow"),
    filter: computedStyle.getPropertyValue("filter"),
    "outline-style": computedStyle.getPropertyValue("outline-style"),
    "outline-width": computedStyle.getPropertyValue("outline-width"),
    "outline-offset": computedStyle.getPropertyValue("outline-offset"),
  });
  // text-shadow shares box-shadow's <offset offset blur> grammar, so the
  // box-shadow extent parser bounds its outward reach too.
  const textShadowBleed = computeAutoBleed({
    "box-shadow": computedStyle.getPropertyValue("text-shadow"),
  });
  return Math.max(bleed, textShadowBleed);
};

export const collectRegionPrunedElements = (
  rootElement: Element,
  region: CaptureRegionRect,
  cullMarginPx: number,
): Set<Element> => {
  const prunedElements = new Set<Element>();
  const defaultView = rootElement.ownerDocument.defaultView;
  if (!defaultView) return prunedElements;
  const keepLeft = region.x - REGION_INK_OVERFLOW_MARGIN_PX;
  const keepTop = region.y - REGION_INK_OVERFLOW_MARGIN_PX;
  const keepRight = region.x + region.width + REGION_INK_OVERFLOW_MARGIN_PX;
  const keepBottom = region.y + region.height + REGION_INK_OVERFLOW_MARGIN_PX;
  const scanLeft = region.x - cullMarginPx;
  const scanTop = region.y - cullMarginPx;
  const scanRight = region.x + region.width + cullMarginPx;
  const scanBottom = region.y + region.height + cullMarginPx;

  const visit = (element: Element): SubtreeExtent => {
    const boundingRect = element.getBoundingClientRect();
    const intersectsKeepRect =
      boundingRect.left < keepRight &&
      boundingRect.right > keepLeft &&
      boundingRect.top < keepBottom &&
      boundingRect.bottom > keepTop;
    const intersectsScanRect =
      boundingRect.left < scanRight &&
      boundingRect.right > scanLeft &&
      boundingRect.top < scanBottom &&
      boundingRect.bottom > scanTop;
    // Only elements in the scan band (outside the keep rect but within
    // cullMarginPx of the region) pay the style reads; shadows/blurs reaching
    // farther than cullMarginPx are ignored by design.
    const paintBleed =
      !intersectsKeepRect && intersectsScanRect
        ? computeElementPaintBleed(element, defaultView)
        : 0;
    const extent: SubtreeExtent = {
      left: boundingRect.left - paintBleed,
      top: boundingRect.top - paintBleed,
      right: boundingRect.right + paintBleed,
      bottom: boundingRect.bottom + paintBleed,
    };
    let hasChildContent = false;
    for (const childNode of getComposedChildNodes(element)) {
      if (isElementNode(childNode)) {
        hasChildContent = true;
        const childExtent = visit(childNode);
        if (childExtent.left < extent.left) extent.left = childExtent.left;
        if (childExtent.top < extent.top) extent.top = childExtent.top;
        if (childExtent.right > extent.right) extent.right = childExtent.right;
        if (childExtent.bottom > extent.bottom) extent.bottom = childExtent.bottom;
      } else if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent !== "") {
        hasChildContent = true;
      }
    }
    if (!hasChildContent) return extent;
    const subtreeIntersectsKeepRect =
      extent.left < keepRight &&
      extent.right > keepLeft &&
      extent.top < keepBottom &&
      extent.bottom > keepTop;
    if (
      !subtreeIntersectsKeepRect &&
      element !== rootElement &&
      isHollowSafeDisplay(defaultView.getComputedStyle(element).getPropertyValue("display"))
    ) {
      prunedElements.add(element);
    }
    return extent;
  };

  visit(rootElement);
  return prunedElements;
};
