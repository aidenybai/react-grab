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
import { getElementTextBounds } from "./get-element-text-bounds.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";
import { compareElementDocumentOrder } from "./compare-element-document-order.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isShadowRoot } from "./is-shadow-root.js";
import { getThreeSelectionElements, resolveThreeElementAtPoint } from "../core/three-selection.js";

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
  excludedElements: Set<Element>,
): void => {
  const candidateQueue = [...candidates].filter(
    (candidateElement) => !excludedElements.has(candidateElement),
  );
  const tableRowQueue = candidateQueue.filter(
    (candidateElement) => candidateElement.tagName === "TR",
  );
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
    tableRowQueue.push(parentElement);
  }

  const addCandidate = (candidateElement: Element | null): void => {
    if (
      !candidateElement ||
      candidates.has(candidateElement) ||
      excludedElements.has(candidateElement) ||
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
    if (candidateElement.tagName === "TR") tableRowQueue.push(candidateElement);
  };

  const addChildren = (childCollection: HTMLCollection): void => {
    if (childCollection.length > DRAG_SELECTION_MAX_LOCAL_COLLECTION_ELEMENTS) return;
    for (const childElement of childCollection) {
      if (inspectedNeighborCount >= DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS) return;
      addCandidate(childElement);
    }
  };

  for (
    let tableRowIndex = 0;
    tableRowIndex < tableRowQueue.length &&
    inspectedNeighborCount < DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS;
    tableRowIndex += 1
  ) {
    const tableRowElement = tableRowQueue[tableRowIndex];
    addCandidate(tableRowElement.previousElementSibling);
    addCandidate(tableRowElement.nextElementSibling);
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
  const candidateValidityByElement = new Map<Element, boolean>();
  const inspectedThreeCanvasElements = new Set<Element>();
  const resolvedThreeCanvasElements = new Set<Element>();
  const coveredCandidates = new Set<Element>();
  const sampleCoordinates = createSampleCoordinates(dragRect, intentPoint);
  const isCandidateValid = (candidateElement: Element): boolean => {
    const cachedValidity = candidateValidityByElement.get(candidateElement);
    if (cachedValidity !== undefined) return cachedValidity;
    const isValid = isValidGrabbableElement(candidateElement);
    candidateValidityByElement.set(candidateElement, isValid);
    return isValid;
  };

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
        if (candidateElement.tagName === "CANVAS") {
          if (resolvedThreeCanvasElements.has(candidateElement)) continue;
          if (inspectedThreeCanvasElements.has(candidateElement)) {
            candidates.add(candidateElement);
            continue;
          }
          inspectedThreeCanvasElements.add(candidateElement);
          let endpointThreeElement = candidateElement;
          if (coordinateIndex === 0) {
            try {
              endpointThreeElement = resolveThreeElementAtPoint(
                candidateElement,
                sampleCoordinates[coordinateIndex],
                sampleCoordinates[coordinateIndex + 1],
              );
            } catch {}
          }
          const threeElements = getThreeSelectionElements(candidateElement, endpointThreeElement);
          if (threeElements.length > 0 || endpointThreeElement !== candidateElement) {
            resolvedThreeCanvasElements.add(candidateElement);
            for (const threeElement of threeElements) {
              candidates.add(threeElement);
            }
            if (endpointThreeElement !== candidateElement) {
              candidates.add(endpointThreeElement);
            }
            continue;
          }
        }
        candidates.add(candidateElement);
      }

      let didFindFrontmostCandidate = false;
      for (const hitElement of elementsAtPoint) {
        let candidateElement = hitElement;
        if (coordinateIndex === 0 && !didFindFrontmostCandidate) {
          const localContentElement = getLocalContentElementAtPoint(
            hitElement,
            sampleCoordinates[coordinateIndex],
            sampleCoordinates[coordinateIndex + 1],
          );
          if (localContentElement && isCandidateValid(localContentElement)) {
            candidates.add(localContentElement);
            if (localContentElement !== hitElement) coveredCandidates.add(hitElement);
            candidateElement = localContentElement;
          }
        }
        if (!isCandidateValid(candidateElement)) continue;
        if (!didFindFrontmostCandidate) {
          didFindFrontmostCandidate = true;
          continue;
        }
        coveredCandidates.add(candidateElement);
      }
    }
  } finally {
    resumePointerEventsFreeze();
  }

  for (const canvasElement of resolvedThreeCanvasElements) candidates.delete(canvasElement);
  addIntersectingNeighbors(
    candidates,
    dragRect,
    candidateBoundsByElement,
    resolvedThreeCanvasElements,
  );

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
    if (!isCandidateValid(candidateElement)) continue;

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

    const candidateIntersectionWidth = Math.max(
      0,
      Math.min(dragRight, candidateRight) - Math.max(dragLeft, candidateLeft),
    );
    const candidateIntersectionHeight = Math.max(
      0,
      Math.min(dragBottom, candidateBottom) - Math.max(dragTop, candidateTop),
    );
    const candidateArea = candidateBounds.width * candidateBounds.height;
    if (candidateIntersectionWidth <= 0 || candidateIntersectionHeight <= 0 || candidateArea <= 0) {
      continue;
    }

    const textBounds = getElementTextBounds(candidateElement);
    let intersectionArea = 0;
    let textArea = 0;
    let intentDistanceSquared = Number.POSITIVE_INFINITY;
    if (textBounds) {
      for (const textFragmentBounds of textBounds) {
        const fragmentLeft = textFragmentBounds.x;
        const fragmentTop = textFragmentBounds.y;
        const fragmentRight = fragmentLeft + textFragmentBounds.width;
        const fragmentBottom = fragmentTop + textFragmentBounds.height;
        const intersectionWidth = Math.max(
          0,
          Math.min(dragRight, fragmentRight) - Math.max(dragLeft, fragmentLeft),
        );
        const intersectionHeight = Math.max(
          0,
          Math.min(dragBottom, fragmentBottom) - Math.max(dragTop, fragmentTop),
        );
        intersectionArea += intersectionWidth * intersectionHeight;
        textArea += textFragmentBounds.width * textFragmentBounds.height;

        const intentDistanceX = Math.max(
          fragmentLeft - intentPoint.x,
          0,
          intentPoint.x - fragmentRight,
        );
        const intentDistanceY = Math.max(
          fragmentTop - intentPoint.y,
          0,
          intentPoint.y - fragmentBottom,
        );
        const fragmentIntentDistanceSquared =
          intentDistanceX * intentDistanceX + intentDistanceY * intentDistanceY;
        intentDistanceSquared = Math.min(intentDistanceSquared, fragmentIntentDistanceSquared);
      }
    } else {
      intersectionArea = candidateIntersectionWidth * candidateIntersectionHeight;

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
      intentDistanceSquared = intentDistanceX * intentDistanceX + intentDistanceY * intentDistanceY;
    }
    if (intersectionArea <= 0) continue;

    const coverageArea =
      textBounds && !coveredCandidates.has(candidateElement) ? textArea : candidateArea;
    if (intersectionArea / coverageArea >= DRAG_SELECTION_COVERAGE_THRESHOLD) {
      matchingElements.push(candidateElement);
      continue;
    }
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
