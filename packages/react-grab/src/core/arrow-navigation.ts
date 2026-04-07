import {
  HORIZONTAL_NAV_RECT_MATCH_TOLERANCE_PX,
  MAX_ARROW_NAVIGATION_HISTORY,
  MIN_HORIZONTAL_NAV_SIZE_PX,
} from "../constants.js";
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

interface ArrowNavigator {
  findNext: (key: string, currentElement: Element) => Element | null;
  clearHistory: () => void;
}

export const createArrowNavigator = (
  isValidGrabbableElement: ElementValidator,
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

  const isSvgInternal = (element: Element): boolean =>
    element instanceof SVGElement && !(element instanceof SVGSVGElement);

  const hasMeaningfulSize = (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width >= MIN_HORIZONTAL_NAV_SIZE_PX || rect.height >= MIN_HORIZONTAL_NAV_SIZE_PX;
  };

  const doRectsMatch = (rectA: DOMRect, rectB: DOMRect): boolean =>
    Math.abs(rectA.x - rectB.x) <= HORIZONTAL_NAV_RECT_MATCH_TOLERANCE_PX &&
    Math.abs(rectA.y - rectB.y) <= HORIZONTAL_NAV_RECT_MATCH_TOLERANCE_PX &&
    Math.abs(rectA.width - rectB.width) <= HORIZONTAL_NAV_RECT_MATCH_TOLERANCE_PX &&
    Math.abs(rectA.height - rectB.height) <= HORIZONTAL_NAV_RECT_MATCH_TOLERANCE_PX;

  const isHorizontallyGrabbable = (element: Element): boolean =>
    isValidGrabbableElement(element) && !isSvgInternal(element) && hasMeaningfulSize(element);

  const findHorizontal = (currentElement: Element, isForward: boolean): Element | null => {
    const currentRect = currentElement.getBoundingClientRect();

    const isVisuallyDistinct = (candidate: Element): boolean =>
      !doRectsMatch(candidate.getBoundingClientRect(), currentRect);

    const findEdgeDescendant = (parentElement: Element): Element | null => {
      if (parentElement instanceof SVGSVGElement) return null;

      const children = Array.from(parentElement.children);
      const ordered = isForward ? children : children.reverse();
      for (const childElement of ordered) {
        if (isForward) {
          if (isHorizontallyGrabbable(childElement) && isVisuallyDistinct(childElement))
            return childElement;
          const descendant = findEdgeDescendant(childElement);
          if (descendant) return descendant;
        } else {
          const descendant = findEdgeDescendant(childElement);
          if (descendant) return descendant;
          if (isHorizontallyGrabbable(childElement) && isVisuallyDistinct(childElement))
            return childElement;
        }
      }
      return null;
    };

    const getSibling = (element: Element) =>
      isForward ? element.nextElementSibling : element.previousElementSibling;

    let nextElement: Element | null = null;

    if (isForward) {
      nextElement = findEdgeDescendant(currentElement);
    }

    if (!nextElement) {
      let searchElement: Element | null = currentElement;
      while (searchElement) {
        let sibling = getSibling(searchElement);
        while (sibling) {
          if (isHorizontallyGrabbable(sibling) && isVisuallyDistinct(sibling)) {
            nextElement = sibling;
            break;
          }
          const descendant = findEdgeDescendant(sibling);
          if (descendant) {
            nextElement = descendant;
            break;
          }
          sibling = getSibling(sibling);
        }
        if (nextElement) break;
        const parentElement: HTMLElement | null = searchElement.parentElement;
        if (!isForward && parentElement && isHorizontallyGrabbable(parentElement)) {
          nextElement = parentElement;
          break;
        }
        searchElement = parentElement;
      }
    }

    return nextElement;
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
