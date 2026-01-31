import type { OverlayBounds } from "../types.js";
import { getElementsAtPoint } from "../utils/get-element-at-position.js";

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

  const findVerticalNext = (
    currentElement: Element,
    direction: 1 | -1,
  ): Element | null => {
    const bounds = createElementBounds(currentElement);
    const elementsAtPoint = getElementsAtPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    ).filter(isValidGrabbableElement);

    const currentIndex = elementsAtPoint.indexOf(currentElement);
    if (currentIndex === -1) return null;
    return elementsAtPoint[currentIndex + direction] ?? null;
  };

  const findUp = (currentElement: Element): Element | null => {
    const nextElement = findVerticalNext(currentElement, 1);
    if (nextElement) {
      navigationHistory.push(currentElement);
    }
    return nextElement;
  };

  const findDown = (currentElement: Element): Element | null => {
    if (navigationHistory.length > 0) {
      const previousElement = navigationHistory.pop()!;
      if (document.contains(previousElement)) {
        return previousElement;
      }
    }
    return findVerticalNext(currentElement, -1);
  };

  const findHorizontal = (
    currentElement: Element,
    isForward: boolean,
  ): Element | null => {
    const findEdgeDescendant = (parentElement: Element): Element | null => {
      const children = Array.from(parentElement.children);
      const ordered = isForward ? children : children.reverse();
      for (const childElement of ordered) {
        if (isForward) {
          if (isValidGrabbableElement(childElement)) return childElement;
          const descendant = findEdgeDescendant(childElement);
          if (descendant) return descendant;
        } else {
          const descendant = findEdgeDescendant(childElement);
          if (descendant) return descendant;
          if (isValidGrabbableElement(childElement)) return childElement;
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
          const descendant = findEdgeDescendant(sibling);
          if (descendant) {
            nextElement = descendant;
            break;
          }
          if (isValidGrabbableElement(sibling)) {
            nextElement = sibling;
            break;
          }
          sibling = getSibling(sibling);
        }
        if (nextElement) break;
        const parentElement: HTMLElement | null = searchElement.parentElement;
        if (
          !isForward &&
          parentElement &&
          isValidGrabbableElement(parentElement)
        ) {
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
