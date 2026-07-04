import type { CaptureRegionRect } from "../types";
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

export const collectRegionPrunedElements = (
  rootElement: Element,
  region: CaptureRegionRect,
  cullMarginPx: number,
): Set<Element> => {
  const prunedElements = new Set<Element>();
  const defaultView = rootElement.ownerDocument.defaultView;
  if (!defaultView) return prunedElements;
  const regionRight = region.x + region.width;
  const regionBottom = region.y + region.height;

  const visit = (element: Element): SubtreeExtent => {
    const boundingRect = element.getBoundingClientRect();
    const extent: SubtreeExtent = {
      left: boundingRect.left,
      top: boundingRect.top,
      right: boundingRect.right,
      bottom: boundingRect.bottom,
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
    const intersectsRegion =
      extent.left - cullMarginPx < regionRight &&
      extent.right + cullMarginPx > region.x &&
      extent.top - cullMarginPx < regionBottom &&
      extent.bottom + cullMarginPx > region.y;
    if (
      !intersectsRegion &&
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
