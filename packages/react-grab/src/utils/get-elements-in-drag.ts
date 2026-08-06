import type { DragRect, ElementBounds, Position } from "../types.js";
import { suspendPointerEventsFreeze, resumePointerEventsFreeze } from "./pointer-events-freeze.js";
import {
  DRAG_SELECTION_COVERAGE_THRESHOLD,
  DRAG_SELECTION_SAMPLE_SPACING_PX,
  DRAG_SELECTION_MIN_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_SAMPLES_PER_AXIS,
  DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS,
  DRAG_SELECTION_EDGE_INSET_PX,
  DRAG_SELECTION_SAMPLE_COORDINATE_VALUES,
  DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS,
  DRAG_SELECTION_MAX_LOCAL_COLLECTION_ELEMENTS,
  MIN_HIT_TEST_VIEWPORT_DIMENSION_PX,
  VIEWPORT_COVERAGE_THRESHOLD,
} from "../constants.js";
import { isRootElement } from "./is-root-element.js";
import { isWithinScope } from "./runtime-mode.js";
import { clampToRange } from "./clamp-to-range.js";
import { getDeepElementsAtPoint } from "./get-deep-elements-at-point.js";
import { getLocalContentElementAtPoint } from "./get-local-content-element-at-point.js";
import { createElementBounds } from "./create-element-bounds.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";
import { compareElementDocumentOrder } from "./compare-element-document-order.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isShadowRoot } from "./is-shadow-root.js";

const sortByDocumentOrder = (elements: Element[]): Element[] =>
  elements.sort(compareElementDocumentOrder);

const hasValidBounds = (bounds: ElementBounds): boolean =>
  Number.isFinite(bounds.x) &&
  Number.isFinite(bounds.y) &&
  Number.isFinite(bounds.width) &&
  Number.isFinite(bounds.height) &&
  bounds.width > 0 &&
  bounds.height > 0;

const boundsIntersectDrag = (bounds: ElementBounds, dragRect: DragRect): boolean =>
  bounds.x < dragRect.x + dragRect.width &&
  bounds.x + bounds.width > dragRect.x &&
  bounds.y < dragRect.y + dragRect.height &&
  bounds.y + bounds.height > dragRect.y;

const addIntersectingNeighbors = (
  candidates: Set<Element>,
  dragRect: DragRect,
  candidateBoundsByElement: Map<Element, ElementBounds>,
): void => {
  const candidateQueue = [...candidates];
  let inspectedNeighborCount = 0;

  for (
    let candidateIndex = 0;
    candidateIndex < candidateQueue.length &&
    inspectedNeighborCount < DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS;
    candidateIndex += 1
  ) {
    const parentElement = getComposedParentElement(candidateQueue[candidateIndex]);
    if (!parentElement || parentElement.tagName !== "TR" || candidates.has(parentElement)) continue;
    inspectedNeighborCount += 1;
    candidates.add(parentElement);
    candidateQueue.push(parentElement);
  }

  const addCandidate = (candidateElement: Element | null): void => {
    if (
      !candidateElement ||
      candidates.has(candidateElement) ||
      inspectedNeighborCount >= DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS
    ) {
      return;
    }
    inspectedNeighborCount += 1;

    let candidateBounds = candidateBoundsByElement.get(candidateElement);
    if (!candidateBounds) {
      candidateBounds = createElementBounds(candidateElement);
      candidateBoundsByElement.set(candidateElement, candidateBounds);
    }
    if (!hasValidBounds(candidateBounds) || !boundsIntersectDrag(candidateBounds, dragRect)) return;

    candidates.add(candidateElement);
    candidateQueue.push(candidateElement);
  };

  const addChildren = (childCollection: HTMLCollection): void => {
    if (childCollection.length > DRAG_SELECTION_MAX_LOCAL_COLLECTION_ELEMENTS) return;
    for (const childElement of childCollection) {
      if (inspectedNeighborCount >= DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS) return;
      addCandidate(childElement);
    }
  };

  for (
    let candidateIndex = 0;
    candidateIndex < candidateQueue.length &&
    inspectedNeighborCount < DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS;
    candidateIndex += 1
  ) {
    const candidateElement = candidateQueue[candidateIndex];
    if (candidateElement.tagName !== "TR") continue;
    addCandidate(candidateElement.previousElementSibling);
    addCandidate(candidateElement.nextElementSibling);
  }

  for (
    let candidateIndex = 0;
    candidateIndex < candidateQueue.length &&
    inspectedNeighborCount < DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS;
    candidateIndex += 1
  ) {
    const candidateElement = candidateQueue[candidateIndex];
    if (isRootElement(candidateElement)) continue;

    const siblingCount = candidateElement.parentElement?.children.length ?? 0;
    if (
      candidateElement.tagName === "TR" ||
      siblingCount <= DRAG_SELECTION_MAX_LOCAL_COLLECTION_ELEMENTS
    ) {
      addCandidate(candidateElement.previousElementSibling);
      addCandidate(candidateElement.nextElementSibling);
    }

    addChildren(candidateElement.children);
    if (candidateElement.shadowRoot) addChildren(candidateElement.shadowRoot.children);
  }
};

const createSampleCoordinates = (dragRect: DragRect, intentPoint: Position): number[] => {
  if (dragRect.width <= 0 || dragRect.height <= 0) return [];

  const viewportWidth = Math.max(MIN_HIT_TEST_VIEWPORT_DIMENSION_PX, Math.round(window.innerWidth));
  const viewportHeight = Math.max(
    MIN_HIT_TEST_VIEWPORT_DIMENSION_PX,
    Math.round(window.innerHeight),
  );

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

  const pointKeys = new Set<number>();
  const sampleCoordinates: number[] = [];

  const addPoint = (x: number, y: number) => {
    const clampedX = clampToRange(Math.round(x), 0, viewportWidth - 1);
    const clampedY = clampToRange(Math.round(y), 0, viewportHeight - 1);
    const key = clampedY * viewportWidth + clampedX;
    if (pointKeys.has(key)) return;
    pointKeys.add(key);
    sampleCoordinates.push(clampedX, clampedY);
  };

  addPoint(intentPoint.x, intentPoint.y);
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

  return sampleCoordinates;
};

const filterElementsInDrag = (
  dragRect: DragRect,
  intentPoint: Position,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  const dragLeft = dragRect.x;
  const dragTop = dragRect.y;
  const dragRight = dragRect.x + dragRect.width;
  const dragBottom = dragRect.y + dragRect.height;

  const candidates = new Set<Element>();
  const candidateBoundsByElement = new Map<Element, ElementBounds>();
  const sampleCoordinates = createSampleCoordinates(dragRect, intentPoint);

  suspendPointerEventsFreeze();
  try {
    for (
      let coordinateIndex = 0;
      coordinateIndex < sampleCoordinates.length;
      coordinateIndex += DRAG_SELECTION_SAMPLE_COORDINATE_VALUES
    ) {
      const elementsAtPoint = getDeepElementsAtPoint(
        sampleCoordinates[coordinateIndex],
        sampleCoordinates[coordinateIndex + 1],
      );
      for (const candidateElement of elementsAtPoint) {
        candidates.add(candidateElement);
      }

      if (coordinateIndex === 0) {
        for (const candidateElement of elementsAtPoint) {
          const localContentElement = getLocalContentElementAtPoint(
            candidateElement,
            sampleCoordinates[coordinateIndex],
            sampleCoordinates[coordinateIndex + 1],
          );
          if (localContentElement && isValidGrabbableElement(localContentElement)) {
            candidates.add(localContentElement);
            break;
          }
          if (isValidGrabbableElement(candidateElement)) break;
        }
      }
    }
  } finally {
    resumePointerEventsFreeze();
  }

  addIntersectingNeighbors(candidates, dragRect, candidateBoundsByElement);

  const matchingElements: Element[] = [];
  let nearestFallbackElement: Element | null = null;
  let nearestFallbackDistanceSquared = Number.POSITIVE_INFINITY;
  let nearestFallbackArea = Number.POSITIVE_INFINITY;
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

    const candidateBounds =
      candidateBoundsByElement.get(candidateElement) ?? createElementBounds(candidateElement);
    if (!hasValidBounds(candidateBounds)) continue;

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

    const intentDistanceX = Math.max(
      candidateLeft - intentPoint.x,
      0,
      intentPoint.x - candidateRight,
    );
    const intentDistanceY = Math.max(
      candidateTop - intentPoint.y,
      0,
      intentPoint.y - candidateBottom,
    );
    const intentDistanceSquared =
      intentDistanceX * intentDistanceX + intentDistanceY * intentDistanceY;
    const isNearerFallback = intentDistanceSquared < nearestFallbackDistanceSquared;
    const isSmallerEquidistantFallback =
      intentDistanceSquared === nearestFallbackDistanceSquared &&
      candidateArea < nearestFallbackArea;

    if (isNearerFallback || isSmallerEquidistantFallback) {
      nearestFallbackElement = candidateElement;
      nearestFallbackDistanceSquared = intentDistanceSquared;
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
  intentPoint: Position,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  const elements = filterElementsInDrag(dragRect, intentPoint, isValidGrabbableElement);
  return removeNestedElements(elements);
};
