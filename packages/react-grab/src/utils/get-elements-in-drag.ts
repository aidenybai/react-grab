import type { DragRect, Rect } from "../types.js";
import {
  enablePointerEventsOverride,
  disablePointerEventsOverride,
} from "./get-element-at-position.js";

const DRAG_COVERAGE_THRESHOLD = 0.75;
const SAMPLE_SPACING_PX = 24;
const MIN_SAMPLES_PER_AXIS = 3;
const MAX_SAMPLES_PER_AXIS = 30;
const MAX_TOTAL_SAMPLE_POINTS = 600;

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
    Math.ceil(dragRect.width / SAMPLE_SPACING_PX),
    MIN_SAMPLES_PER_AXIS,
    MAX_SAMPLES_PER_AXIS,
  );
  const yCount = clampNumber(
    Math.ceil(dragRect.height / SAMPLE_SPACING_PX),
    MIN_SAMPLES_PER_AXIS,
    MAX_SAMPLES_PER_AXIS,
  );
  const totalGridPoints = xCount * yCount;
  const scale =
    totalGridPoints > MAX_TOTAL_SAMPLE_POINTS
      ? Math.sqrt(MAX_TOTAL_SAMPLE_POINTS / totalGridPoints)
      : 1;
  const scaledXCount = clampNumber(
    Math.floor(xCount * scale),
    MIN_SAMPLES_PER_AXIS,
    MAX_SAMPLES_PER_AXIS,
  );
  const scaledYCount = clampNumber(
    Math.floor(yCount * scale),
    MIN_SAMPLES_PER_AXIS,
    MAX_SAMPLES_PER_AXIS,
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

  const edgeInset = 1;
  addPoint(left + edgeInset, top + edgeInset);
  addPoint(right - edgeInset, top + edgeInset);
  addPoint(left + edgeInset, bottom - edgeInset);
  addPoint(right - edgeInset, bottom - edgeInset);
  addPoint(centerX, top + edgeInset);
  addPoint(centerX, bottom - edgeInset);
  addPoint(left + edgeInset, centerY);
  addPoint(right - edgeInset, centerY);
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
        intersectionArea / elementArea >= DRAG_COVERAGE_THRESHOLD;

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
