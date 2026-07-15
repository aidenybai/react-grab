import type { DragRect, Rect } from "../types.js";
import { suspendPointerEventsFreeze, resumePointerEventsFreeze } from "./pointer-events-freeze.js";
import {
  DRAG_SELECTION_COVERAGE_THRESHOLD,
  DRAG_SELECTION_SAMPLE_SPACING_PX,
  DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS,
  DRAG_SELECTION_EDGE_INSET_PX,
} from "../constants.js";
import { isRootElement } from "./is-root-element.js";
import { isWithinScope } from "./runtime-mode.js";
import { clampToRange } from "./clamp-to-range.js";
import { getDeepElementsAtPoint } from "./get-deep-elements-at-point.js";
import { createElementBounds } from "./create-element-bounds.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";
import { compareElementDocumentOrder } from "./compare-element-document-order.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isShadowRoot } from "./is-shadow-root.js";

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

const sortByDocumentOrder = (elements: Element[]): Element[] =>
  elements.sort(compareElementDocumentOrder);

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

  const xCount = clampToRange(
    Math.ceil(dragRect.width / DRAG_SELECTION_SAMPLE_SPACING_PX),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );
  const yCount = clampToRange(
    Math.ceil(dragRect.height / DRAG_SELECTION_SAMPLE_SPACING_PX),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );
  const totalGridPoints = xCount * yCount;
  const scale =
    totalGridPoints > DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS
      ? Math.sqrt(DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS / totalGridPoints)
      : 1;
  const scaledXCount = clampToRange(
    Math.floor(xCount * scale),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );
  const scaledYCount = clampToRange(
    Math.floor(yCount * scale),
    DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
    DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  );

  const pointKeys = new Set<string>();
  const points: SamplePoint[] = [];

  const addPoint = (x: number, y: number) => {
    const clampedX = clampToRange(Math.round(x), 0, viewportWidth - 1);
    const clampedY = clampToRange(Math.round(y), 0, viewportHeight - 1);
    const key = `${clampedX}:${clampedY}`;
    if (pointKeys.has(key)) return;
    pointKeys.add(key);
    points.push({ x: clampedX, y: clampedY });
  };

  addPoint(left + DRAG_SELECTION_EDGE_INSET_PX, top + DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(right - DRAG_SELECTION_EDGE_INSET_PX, top + DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(left + DRAG_SELECTION_EDGE_INSET_PX, bottom - DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(right - DRAG_SELECTION_EDGE_INSET_PX, bottom - DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(centerX, top + DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(centerX, bottom - DRAG_SELECTION_EDGE_INSET_PX);
  addPoint(left + DRAG_SELECTION_EDGE_INSET_PX, centerY);
  addPoint(right - DRAG_SELECTION_EDGE_INSET_PX, centerY);
  addPoint(centerX, centerY);

  for (let xIndex = 0; xIndex < scaledXCount; xIndex += 1) {
    const sampleX = left + ((xIndex + 0.5) / scaledXCount) * dragRect.width;
    for (let yIndex = 0; yIndex < scaledYCount; yIndex += 1) {
      const sampleY = top + ((yIndex + 0.5) / scaledYCount) * dragRect.height;
      addPoint(sampleX, sampleY);
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

  suspendPointerEventsFreeze();
  try {
    for (const point of samplePoints) {
      const elementsAtPoint = getDeepElementsAtPoint(point.x, point.y);
      for (const candidateElement of elementsAtPoint) {
        candidates.add(candidateElement);
      }
    }
  } finally {
    resumePointerEventsFreeze();
  }

  const matchingElements: Element[] = [];
  for (const candidateElement of candidates) {
    if (isIframeElement(candidateElement) && getAccessibleIframeDocument(candidateElement)) {
      continue;
    }
    if (!shouldCheckCoverage && isRootElement(candidateElement)) continue;
    if (!isWithinScope(candidateElement)) continue;
    if (!isValidGrabbableElement(candidateElement)) continue;

    const candidateBounds = createElementBounds(candidateElement);
    if (candidateBounds.width <= 0 || candidateBounds.height <= 0) continue;
    const bounds: Rect = {
      left: candidateBounds.x,
      top: candidateBounds.y,
      right: candidateBounds.x + candidateBounds.width,
      bottom: candidateBounds.y + candidateBounds.height,
    };
    if (shouldCheckCoverage) {
      const intersectionArea = calculateIntersectionArea(dragBounds, bounds);
      const candidateArea = candidateBounds.width * candidateBounds.height;
      const hasMajorityCoverage =
        intersectionArea / candidateArea >= DRAG_SELECTION_COVERAGE_THRESHOLD;

      if (hasMajorityCoverage) {
        matchingElements.push(candidateElement);
      }
    } else if (hasIntersection(bounds, dragBounds)) {
      matchingElements.push(candidateElement);
    }
  }

  return sortByDocumentOrder(matchingElements);
};

const removeNestedElements = (elements: Element[]): Element[] => {
  // Drop any element that has an ancestor also in the set. Walking each
  // element's parent chain against a membership Set is O(n·depth) — the
  // previous elements.some(contains) form was O(n²) over the candidate set,
  // which spikes on dense drags (large-drag-selection covers it).
  // Open shadow hosts are traversal boundaries, so an inner candidate replaces
  // its host instead of being discarded as an ordinary nested element.
  const elementSet = new Set(elements);
  const selectedElements: Element[] = [];
  for (let elementIndex = elements.length - 1; elementIndex >= 0; elementIndex -= 1) {
    const element = elements[elementIndex];
    if (!elementSet.has(element)) continue;

    let descendant = element;
    let ancestor = getComposedParentElement(descendant);
    let hasSelectedAncestor = false;
    while (ancestor) {
      const descendantRoot = descendant.getRootNode();
      if (
        elementSet.has(ancestor) &&
        isShadowRoot(descendantRoot) &&
        descendantRoot.host === ancestor
      ) {
        elementSet.delete(ancestor);
      } else if (elementSet.has(ancestor)) {
        hasSelectedAncestor = true;
        break;
      }
      descendant = ancestor;
      ancestor = getComposedParentElement(descendant);
    }
    if (!hasSelectedAncestor) selectedElements.push(element);
  }
  return selectedElements.reverse();
};

export const getElementsInDrag = (
  dragRect: DragRect,
  isValidGrabbableElement: (element: Element) => boolean,
  shouldCheckCoverage = true,
): Element[] => {
  const elements = filterElementsInDrag(dragRect, isValidGrabbableElement, shouldCheckCoverage);
  return removeNestedElements(elements);
};
