import type { DragRect, Rect } from "../types.js";
import {
  enablePointerEventsOverride,
  disablePointerEventsOverride,
} from "./pointer-events-override.js";
import {
  DRAG_SELECTION_COVERAGE_THRESHOLD,
  DRAG_SELECTION_SAMPLE_SPACING_PX,
  DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS,
  DRAG_SELECTION_EDGE_INSET_PX,
} from "../constants.js";

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

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const sortByDocumentOrder = (elements: Element[]): Element[] => {
  return elements.sort((leftElement, rightElement) => {
    if (leftElement === rightElement) return 0;
    const position = leftElement.compareDocumentPosition(rightElement);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
};

interface SamplePoint {
  x: number;
  y: number;
}

const createSamplePoints = (dragRect: DragRect): SamplePoint[] => {
  if (dragRect.width <= 0 || dragRect.height <= 0) return [];

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const left = dragRect.x;
  const top = dragRect.y;
  const right = dragRect.x + dragRect.width;
  const bottom = dragRect.y + dragRect.height;

  const centerX = left + dragRect.width / 2;
  const centerY = top + dragRect.height / 2;

  const xCount = clampNumber(
    Math.ceil(dragRect.width / DRAG_SELECTION_SAMPLE_SPACING_PX),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );
  const yCount = clampNumber(
    Math.ceil(dragRect.height / DRAG_SELECTION_SAMPLE_SPACING_PX),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );
  const totalGridPoints = xCount * yCount;
  const scale =
    totalGridPoints > DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS
      ? Math.sqrt(DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS / totalGridPoints)
      : 1;
  const scaledXCount = clampNumber(
    Math.floor(xCount * scale),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );
  const scaledYCount = clampNumber(
    Math.floor(yCount * scale),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );

  const pointKeys = new Set<string>();
  const points: SamplePoint[] = [];

  const addPoint = (x: number, y: number) => {
    const clampedX = clampNumber(Math.round(x), 0, viewportWidth - 1);
    const clampedY = clampNumber(Math.round(y), 0, viewportHeight - 1);
    const key = `${clampedX}:${clampedY}`;
    if (pointKeys.has(key)) return;
    pointKeys.add(key);
    points.push({ x: clampedX, y: clampedY });
  };

  addPoint(
    left + DRAG_SELECTION_EDGE_INSET_PX,
    top + DRAG_SELECTION_EDGE_INSET_PX,
  );
  addPoint(
    right - DRAG_SELECTION_EDGE_INSET_PX,
    top + DRAG_SELECTION_EDGE_INSET_PX,
  );
  addPoint(
    left + DRAG_SELECTION_EDGE_INSET_PX,
    bottom - DRAG_SELECTION_EDGE_INSET_PX,
  );
  addPoint(
    right - DRAG_SELECTION_EDGE_INSET_PX,
    bottom - DRAG_SELECTION_EDGE_INSET_PX,
  );
  addPoint(centerX, top + DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(centerX, bottom - DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(left + DRAG_SELECTION_EDGE_INSET_PX, centerY);
  addPoint(right - DRAG_SELECTION_EDGE_INSET_PX, centerY);
  addPoint(centerX, centerY);

  for (let xIndex = 0; xIndex < scaledXCount; xIndex += 1) {
    const x = left + ((xIndex + 0.5) / scaledXCount) * dragRect.width;
    for (let yIndex = 0; yIndex < scaledYCount; yIndex += 1) {
      const y = top + ((yIndex + 0.5) / scaledYCount) * dragRect.height;
      addPoint(x, y);
    }
  }

  return points;
};

const filterElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
  shouldCheckCoverage: boolean,
): Element[] => {
  const dragBounds: Rect = {
    left: dragRect.x,
    top: dragRect.y,
    right: dragRect.x + dragRect.width,
    bottom: dragRect.y + dragRect.height,
  };

  const candidates = new Set<Element>();
  const samplePoints = createSamplePoints(dragRect);

  enablePointerEventsOverride();
  try {
    for (const point of samplePoints) {
      const elementsAtPoint = document.elementsFromPoint(point.x, point.y);
      for (const candidateElement of elementsAtPoint) {
        candidates.add(candidateElement);
      }
    }
  } finally {
    disablePointerEventsOverride();
  }

  const matchingElements: Element[] = [];

  for (const candidateElement of candidates) {
    if (!shouldCheckCoverage) {
      const tagName = (candidateElement.tagName || "").toUpperCase();
      if (tagName === "HTML" || tagName === "BODY") continue;
    }

    if (!isValidGrabbableElement(candidateElement)) continue;

    const elementRect = candidateElement.getBoundingClientRect();
    if (elementRect.width <= 0 || elementRect.height <= 0) continue;

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
      const elementArea = elementRect.width * elementRect.height;
      const hasMajorityCoverage =
        elementArea > 0 &&
        intersectionArea / elementArea >= DRAG_SELECTION_COVERAGE_THRESHOLD;

      if (hasMajorityCoverage) {
        matchingElements.push(candidateElement);
      }
    } else if (hasIntersection(elementBounds, dragBounds)) {
      matchingElements.push(candidateElement);
    }
  }

  return sortByDocumentOrder(matchingElements);
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
  strict = true,
): Element[] => {
  const elements = filterElementsInDrag(
    dragRect,
    isValidGrabbableElement,
    strict,
  );
  return removeNestedElements(elements);
};
