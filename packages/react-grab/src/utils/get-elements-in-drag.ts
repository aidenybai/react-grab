const DRAG_COVERAGE_THRESHOLD = 0.75;

interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const filterElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
  shouldCheckCoverage: boolean,
): Element[] => {
  const elements: Element[] = [];
  const allElements = Array.from(document.querySelectorAll("*"));

  const dragLeft = dragRect.x;
  const dragTop = dragRect.y;
  const dragRight = dragRect.x + dragRect.width;
  const dragBottom = dragRect.y + dragRect.height;

  for (const candidateElement of allElements) {
    if (!shouldCheckCoverage) {
      const tagName = (candidateElement.tagName || "").toUpperCase();
      if (tagName === "HTML" || tagName === "BODY") continue;
    }

    if (!isValidGrabbableElement(candidateElement)) {
      continue;
    }

    const elementRect = candidateElement.getBoundingClientRect();
    const elementLeft = elementRect.left;
    const elementTop = elementRect.top;
    const elementRight = elementRect.left + elementRect.width;
    const elementBottom = elementRect.top + elementRect.height;

    if (shouldCheckCoverage) {
      const intersectionLeft = Math.max(dragLeft, elementLeft);
      const intersectionTop = Math.max(dragTop, elementTop);
      const intersectionRight = Math.min(dragRight, elementRight);
      const intersectionBottom = Math.min(dragBottom, elementBottom);

      const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
      const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);
      const intersectionArea = intersectionWidth * intersectionHeight;

      const elementArea = Math.max(0, elementRect.width * elementRect.height);
      const hasMajorityCoverage =
        elementArea > 0 &&
        intersectionArea / elementArea >= DRAG_COVERAGE_THRESHOLD;

      if (hasMajorityCoverage) {
        elements.push(candidateElement);
      }
    } else {
      const hasIntersection =
        elementLeft < dragRight &&
        elementRight > dragLeft &&
        elementTop < dragBottom &&
        elementBottom > dragTop;

      if (hasIntersection) {
        elements.push(candidateElement);
      }
    }
  }

  return elements;
};

export const getElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  return filterElementsInDrag(dragRect, isValidGrabbableElement, true);
};

export const getElementsInDragLoose = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  return filterElementsInDrag(dragRect, isValidGrabbableElement, false);
};
