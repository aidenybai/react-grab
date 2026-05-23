import { MAX_ARROW_NAVIGATION_HISTORY } from "../constants.js";
import type { OverlayBounds } from "../types.js";
import { getElementsAtPoint } from "../utils/get-element-at-position.js";
import { getVisibleBoundsCenter } from "../utils/get-visible-bounds-center.js";
import { isElementConnected } from "../utils/is-element-connected.js";

interface ElementValidator {
  (element: Element): boolean;
}

interface BoundsCalculator {
  (element: Element): OverlayBounds;
}

interface AncestorStackNavigator {
  stepUp: (currentElement: Element) => Element | null;
  stepDown: (currentElement: Element) => Element | null;
  clearHistory: () => void;
}

export const createAncestorStackNavigator = (
  isValidGrabbableElement: ElementValidator,
  createElementBounds: BoundsCalculator,
): AncestorStackNavigator => {
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

  const stepUp = (currentElement: Element): Element | null => {
    const nextElement = findVerticalNext(currentElement, 1);
    if (nextElement) {
      navigationHistory.push(currentElement);
      if (navigationHistory.length > MAX_ARROW_NAVIGATION_HISTORY) {
        navigationHistory = navigationHistory.slice(-MAX_ARROW_NAVIGATION_HISTORY);
      }
    }
    return nextElement;
  };

  const stepDown = (currentElement: Element): Element | null => {
    if (navigationHistory.length > 0) {
      const previousElement = navigationHistory.pop()!;
      if (isElementConnected(previousElement)) {
        return previousElement;
      }
    }
    return findVerticalNext(currentElement, -1);
  };

  const clearHistory = () => {
    navigationHistory = [];
  };

  return {
    stepUp,
    stepDown,
    clearHistory,
  };
};
