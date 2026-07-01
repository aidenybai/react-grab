import { MAX_ARROW_NAVIGATION_HISTORY } from "../constants.js";
import type { ElementPredicate, OverlayBounds } from "../types.js";
import { getElementsAtPoint } from "../utils/get-element-at-position.js";
import { getVisibleBoundsCenter } from "../utils/get-visible-bounds-center.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { isHorizontallyGrabbable } from "../utils/is-horizontally-grabbable.js";

interface BoundsCalculator {
  (element: Element): OverlayBounds;
}

interface ArrowNavigator {
  findNext: (key: string, currentElement: Element) => Element | null;
  clearHistory: () => void;
}

export const createArrowNavigator = (
  isValidGrabbableElement: ElementPredicate,
  createElementBounds: BoundsCalculator,
): ArrowNavigator => {
  let navigationHistory: Element[] = [];

  const findVerticalNext = (currentElement: Element, direction: 1 | -1): Element | null => {
    const bounds = createElementBounds(currentElement);
    const probePoint = getVisibleBoundsCenter(bounds);
    const elementsAtPoint = getElementsAtPoint(probePoint.x, probePoint.y).filter(
      isValidGrabbableElement,
    );

    const currentIndex = elementsAtPoint.indexOf(currentElement);
    if (currentIndex === -1) return null;
    return elementsAtPoint[currentIndex + direction] ?? null;
  };

  const findUp = (currentElement: Element): Element | null => {
    const nextElement = findVerticalNext(currentElement, 1);
    if (nextElement) {
      navigationHistory.push(currentElement);
      if (navigationHistory.length > MAX_ARROW_NAVIGATION_HISTORY) {
        navigationHistory = navigationHistory.slice(-MAX_ARROW_NAVIGATION_HISTORY);
      }
    }
    return nextElement;
  };

  const findDown = (currentElement: Element): Element | null => {
    if (navigationHistory.length > 0) {
      const previousElement = navigationHistory.pop()!;
      if (isElementConnected(previousElement)) {
        return previousElement;
      }
    }
    return findVerticalNext(currentElement, -1);
  };

  // ArrowLeft/ArrowRight walk strictly between DOM siblings of the current
  // element (previous/back, next/forward), skipping non-grabbable or
  // zero-size siblings. Climbing to parents and descending into children is
  // handled by the vertical (Up/Down) traversal instead.
  const findHorizontal = (currentElement: Element, isForward: boolean): Element | null => {
    const getSibling = (element: Element) =>
      isForward ? element.nextElementSibling : element.previousElementSibling;

    let sibling = getSibling(currentElement);
    while (sibling) {
      if (isHorizontallyGrabbable(sibling, isValidGrabbableElement)) {
        // Moving sideways invalidates the vertical Up history, otherwise the
        // next ArrowDown would retrace into the branch we just left.
        navigationHistory = [];
        return sibling;
      }
      sibling = getSibling(sibling);
    }
    return null;
  };

  const findNext = (key: string, currentElement: Element): Element | null => {
    switch (key) {
      case "ArrowUp":
        return findUp(currentElement);
      case "ArrowDown":
        return findDown(currentElement);
      case "ArrowRight":
        return findHorizontal(currentElement, true);
      case "ArrowLeft":
        return findHorizontal(currentElement, false);
      default:
        return null;
    }
  };

  const clearHistory = () => {
    navigationHistory = [];
  };

  return {
    findNext,
    clearHistory,
  };
};
