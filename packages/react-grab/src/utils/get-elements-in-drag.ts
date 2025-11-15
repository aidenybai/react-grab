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

const removeNestedElements = (elements: Element[]): Element[] => {
  return elements.filter((element) => {
    return !elements.some((otherElement) =>
      otherElement !== element && otherElement.contains(element)
    );
  });
};

const findBestParentElement = (
  elements: Element[],
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element | null => {
  if (elements.length <= 1) return null;

  const dragLeft = dragRect.x;
  const dragTop = dragRect.y;
  const dragRight = dragRect.x + dragRect.width;
  const dragBottom = dragRect.y + dragRect.height;

  let currentParent: Element | null = elements[0];

  while (currentParent) {
    const parent: HTMLElement | null = currentParent.parentElement;
    if (!parent) break;

    const parentRect: DOMRect = parent.getBoundingClientRect();

    const intersectionLeft: number = Math.max(dragLeft, parentRect.left);
    const intersectionTop: number = Math.max(dragTop, parentRect.top);
    const intersectionRight: number = Math.min(dragRight, parentRect.left + parentRect.width);
    const intersectionBottom: number = Math.min(dragBottom, parentRect.top + parentRect.height);

    const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
    const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);
    const intersectionArea = intersectionWidth * intersectionHeight;

    const parentArea = Math.max(0, parentRect.width * parentRect.height);
    const hasMajorityCoverage =
      parentArea > 0 &&
      intersectionArea / parentArea >= DRAG_COVERAGE_THRESHOLD;

    if (!hasMajorityCoverage) break;

    if (!isValidGrabbableElement(parent)) {
      currentParent = parent;
      continue;
    }

    const allChildrenInParent = elements.every((element) =>
      parent.contains(element)
    );

    if (allChildrenInParent) {
      return parent;
    }

    currentParent = parent;
  }

  return null;
};

export const getElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  const elements = filterElementsInDrag(dragRect, isValidGrabbableElement, true);
  const uniqueElements = removeNestedElements(elements);

  return uniqueElements;
};

export const getElementsInDragLoose = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  const elements = filterElementsInDrag(dragRect, isValidGrabbableElement, false);
  const uniqueElements = removeNestedElements(elements);

  return uniqueElements;
};
