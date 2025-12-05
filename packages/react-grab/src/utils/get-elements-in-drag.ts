import type { DragRect, Rect } from "../types.js";

const DRAG_COVERAGE_THRESHOLD = 0.75;

const calculateIntersectionArea = (rect1: Rect, rect2: Rect): number => {
  const intersectionLeft = Math.max(rect1.left, rect2.left);
  const intersectionTop = Math.max(rect1.top, rect2.top);
  const intersectionRight = Math.min(rect1.right, rect2.right);
  const intersectionBottom = Math.min(rect1.bottom, rect2.bottom);

  const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
  const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);

  return intersectionWidth * intersectionHeight;
};

const hasIntersection = (rect1: Rect, rect2: Rect): boolean => {
  return (
    rect1.left < rect2.right &&
    rect1.right > rect2.left &&
    rect1.top < rect2.bottom &&
    rect1.bottom > rect2.top
  );
};

const filterElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
  shouldCheckCoverage: boolean,
): Element[] => {
  const elements: Element[] = [];
  const allElements = Array.from(document.querySelectorAll("*"));

  const dragBounds: Rect = {
    left: dragRect.x,
    top: dragRect.y,
    right: dragRect.x + dragRect.width,
    bottom: dragRect.y + dragRect.height,
  };

  for (const candidateElement of allElements) {
    if (!shouldCheckCoverage) {
      const tagName = (candidateElement.tagName || "").toUpperCase();
      if (tagName === "HTML" || tagName === "BODY") continue;
    }

    if (!isValidGrabbableElement(candidateElement)) {
      continue;
    }

    const elementRect = candidateElement.getBoundingClientRect();
    const elementBounds: Rect = {
      left: elementRect.left,
      top: elementRect.top,
      right: elementRect.left + elementRect.width,
      bottom: elementRect.top + elementRect.height,
    };

    if (shouldCheckCoverage) {
      const intersectionArea = calculateIntersectionArea(
        dragBounds,
        elementBounds,
      );
      const elementArea = Math.max(0, elementRect.width * elementRect.height);
      const hasMajorityCoverage =
        elementArea > 0 &&
        intersectionArea / elementArea >= DRAG_COVERAGE_THRESHOLD;

      if (hasMajorityCoverage) {
        elements.push(candidateElement);
      }
    } else {
      if (hasIntersection(elementBounds, dragBounds)) {
        elements.push(candidateElement);
      }
    }
  }

  return elements;
};

const removeNestedElements = (elements: Element[]): Element[] => {
  return elements.filter((element) => {
    return !elements.some(
      (otherElement) =>
        otherElement !== element && otherElement.contains(element),
    );
  });
};

export const getElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  const elements = filterElementsInDrag(
    dragRect,
    isValidGrabbableElement,
    true,
  );
  const uniqueElements = removeNestedElements(elements);

  return uniqueElements;
};

export const getElementsInDragLoose = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  const elements = filterElementsInDrag(
    dragRect,
    isValidGrabbableElement,
    false,
  );
  const uniqueElements = removeNestedElements(elements);

  return uniqueElements;
};
