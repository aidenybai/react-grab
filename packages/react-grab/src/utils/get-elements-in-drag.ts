import type { DragRect } from "../types.js";
import { suspendPointerEventsFreeze, resumePointerEventsFreeze } from "./pointer-events-freeze.js";
import {
  DRAG_SELECTION_COVERAGE_THRESHOLD,
  DRAG_SELECTION_SAMPLE_SPACING_PX,
  DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS,
  DRAG_SELECTION_EDGE_INSET_PX,
  VIEWPORT_COVERAGE_THRESHOLD,
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
): Element[] => {
  const dragLeft = dragRect.x;
  const dragTop = dragRect.y;
  const dragRight = dragRect.x + dragRect.width;
  const dragBottom = dragRect.y + dragRect.height;

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
  let nearestFallbackElement: Element | null = null;
  let nearestFallbackDistanceSquared = Number.POSITIVE_INFINITY;
  let nearestFallbackArea = Number.POSITIVE_INFINITY;
  const dragCenterX = dragRect.x + dragRect.width / 2;
  const dragCenterY = dragRect.y + dragRect.height / 2;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const hasMeasurableViewport = viewportWidth > 0 && viewportHeight > 0;
  const viewportCoverWidth = viewportWidth * VIEWPORT_COVERAGE_THRESHOLD;
  const viewportCoverHeight = viewportHeight * VIEWPORT_COVERAGE_THRESHOLD;
  for (const candidateElement of candidates) {
    if (isIframeElement(candidateElement) && getAccessibleIframeDocument(candidateElement)) {
      continue;
    }
    if (isRootElement(candidateElement)) continue;
    if (!isWithinScope(candidateElement)) continue;
    if (!isValidGrabbableElement(candidateElement)) continue;

    const candidateBounds = createElementBounds(candidateElement);
    if (
      !Number.isFinite(candidateBounds.x) ||
      !Number.isFinite(candidateBounds.y) ||
      !Number.isFinite(candidateBounds.width) ||
      !Number.isFinite(candidateBounds.height) ||
      candidateBounds.width <= 0 ||
      candidateBounds.height <= 0
    ) {
      continue;
    }

    const candidateLeft = candidateBounds.x;
    const candidateTop = candidateBounds.y;
    const candidateRight = candidateLeft + candidateBounds.width;
    const candidateBottom = candidateTop + candidateBounds.height;
    const coversViewport =
      hasMeasurableViewport &&
      candidateBounds.width >= viewportCoverWidth &&
      candidateBounds.height >= viewportCoverHeight &&
      Math.min(viewportWidth, candidateRight) - Math.max(0, candidateLeft) >= viewportCoverWidth &&
      Math.min(viewportHeight, candidateBottom) - Math.max(0, candidateTop) >= viewportCoverHeight;
    if (coversViewport) continue;

    const intersectionWidth = Math.max(
      0,
      Math.min(dragRight, candidateRight) - Math.max(dragLeft, candidateLeft),
    );
    const intersectionHeight = Math.max(
      0,
      Math.min(dragBottom, candidateBottom) - Math.max(dragTop, candidateTop),
    );
    const intersectionArea = intersectionWidth * intersectionHeight;
    if (intersectionArea <= 0) continue;

    const candidateArea = candidateBounds.width * candidateBounds.height;
    if (intersectionArea / candidateArea >= DRAG_SELECTION_COVERAGE_THRESHOLD) {
      matchingElements.push(candidateElement);
      continue;
    }

    const candidateCenterX = candidateLeft + candidateBounds.width / 2;
    const candidateCenterY = candidateTop + candidateBounds.height / 2;
    const centerDistanceX = candidateCenterX - dragCenterX;
    const centerDistanceY = candidateCenterY - dragCenterY;
    const centerDistanceSquared =
      centerDistanceX * centerDistanceX + centerDistanceY * centerDistanceY;
    const isNearerFallback = centerDistanceSquared < nearestFallbackDistanceSquared;
    const isSmallerEquidistantFallback =
      centerDistanceSquared === nearestFallbackDistanceSquared &&
      candidateArea < nearestFallbackArea;

    if (isNearerFallback || isSmallerEquidistantFallback) {
      nearestFallbackElement = candidateElement;
      nearestFallbackDistanceSquared = centerDistanceSquared;
      nearestFallbackArea = candidateArea;
    }
  }

  return matchingElements.length > 0
    ? sortByDocumentOrder(matchingElements)
    : nearestFallbackElement
      ? [nearestFallbackElement]
      : [];
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
): Element[] => {
  const elements = filterElementsInDrag(dragRect, isValidGrabbableElement);
  return removeNestedElements(elements);
};
