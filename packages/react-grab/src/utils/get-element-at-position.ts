import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import {
  ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX,
  ELEMENT_POSITION_THROTTLE_MS,
  POINTER_EVENTS_RESUME_DEBOUNCE_MS,
} from "../constants.js";
import { suspendPointerEventsFreeze, resumePointerEventsFreeze } from "./freeze-pseudo-states.js";
import { isElementAtPointIndexReady, queryElementAtPointIndex } from "./element-at-point-index.js";

interface PositionCache {
  clientX: number;
  clientY: number;
  element: Element | null;
  timestamp: number;
}

interface IFrameHoverCache {
  element: HTMLIFrameElement;
  rect: DOMRect;
}

let cache: PositionCache | null = null;
let hoveredIframe: IFrameHoverCache | null = null;
let resumeTimerId: ReturnType<typeof setTimeout> | null = null;

const isPointInsideRect = (clientX: number, clientY: number, rect: DOMRect): boolean =>
  clientX >= rect.left &&
  clientX <= rect.right &&
  clientY >= rect.top &&
  clientY <= rect.bottom;

const scheduleResume = (): void => {
  if (resumeTimerId !== null) {
    clearTimeout(resumeTimerId);
  }
  resumeTimerId = setTimeout(() => {
    resumeTimerId = null;
    resumePointerEventsFreeze();
  }, POINTER_EVENTS_RESUME_DEBOUNCE_MS);
};

const cancelScheduledResume = (): void => {
  if (resumeTimerId !== null) {
    clearTimeout(resumeTimerId);
    resumeTimerId = null;
  }
};

const isWithinThreshold = (x1: number, y1: number, x2: number, y2: number): boolean => {
  const deltaX = Math.abs(x1 - x2);
  const deltaY = Math.abs(y1 - y2);
  return (
    deltaX <= ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX &&
    deltaY <= ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX
  );
};

export const getElementsAtPoint = (clientX: number, clientY: number): Element[] => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return [];
  cancelScheduledResume();
  suspendPointerEventsFreeze();
  const elements = document.elementsFromPoint(clientX, clientY);
  scheduleResume();
  return elements;
};

// Three-tier element detection with browser-first safety:
//
//   Tier 1: elementFromPoint (~0.1ms)
//     Browser-native hit-test. Handles all CSS edge cases (clip-path,
//     pointer-events, stacking contexts, shadow DOM) correctly. Used as
//     the primary answer whenever the topmost element is grabbable.
//
//   Tier 2: queryElementAtPointIndex (~0.01ms, O(log n) R-tree)
//     Pre-built spatial index consulted when tier 1 returns a non-grabbable
//     element (decorative overlay, dev tools canvas, root). Avoids the
//     expensive tier 3 call in the common overlay-fallback case.
//     Does not require pointer-events suspension. Queries cached geometry.
//
//   Tier 3: elementsFromPoint (1-5ms)
//     Full z-ordered stack scan. Last resort when both tier 1 and tier 2
//     miss (e.g. spatial index not yet ready, or element not indexed).
//
// All three tiers run inside a single suspend/resume window. The suspend
// disables html { pointer-events: none } so the browser's hit-test APIs
// can reach page elements through the overlay. The debounced resume
// (POINTER_EVENTS_RESUME_DEBOUNCE_MS) ensures rapid sequential calls
// don't repeatedly toggle the stylesheet.
export const getElementAtPosition = (clientX: number, clientY: number): Element | null => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const now = performance.now();

  // elementFromPoint on the parent document cannot descend into iframes, so
  // any point within an iframe's rect resolves to the iframe itself. Returning
  // the cached iframe without calling suspendPointerEventsFreeze lets the
  // pending resume timer re-enable `html { pointer-events: none }`, which stops
  // the browser from dispatching pointer events into the iframe's document -
  // the source of lag on srcdoc iframes running their own React/JIT pipelines.
  if (hoveredIframe && isPointInsideRect(clientX, clientY, hoveredIframe.rect)) {
    return hoveredIframe.element;
  }

  if (cache) {
    const isPositionClose = isWithinThreshold(clientX, clientY, cache.clientX, cache.clientY);
    const isWithinThrottle = now - cache.timestamp < ELEMENT_POSITION_THROTTLE_MS;

    if (isPositionClose || isWithinThrottle) {
      return cache.element;
    }
  }

  cancelScheduledResume();
  suspendPointerEventsFreeze();

  let result: Element | null = null;

  // Tier 1: browser-native, always correct for z-order
  const topElement = document.elementFromPoint(clientX, clientY);
  if (topElement && isValidGrabbableElement(topElement)) {
    result = topElement;
  } else if (isElementAtPointIndexReady()) {
    // Tier 2: spatial index fallback for non-grabbable top elements
    const spatialResult = queryElementAtPointIndex(clientX, clientY);
    if (spatialResult && isValidGrabbableElement(spatialResult)) {
      result = spatialResult;
    }
  }

  if (!result) {
    // Tier 3: full z-stack scan, skipping the already-rejected topElement
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
    for (const candidateElement of elementsAtPoint) {
      if (candidateElement !== topElement && isValidGrabbableElement(candidateElement)) {
        result = candidateElement;
        break;
      }
    }
  }

  scheduleResume();

  hoveredIframe =
    result instanceof HTMLIFrameElement
      ? { element: result, rect: result.getBoundingClientRect() }
      : null;
  cache = { clientX, clientY, element: result, timestamp: now };
  return result;
};

export const clearElementPositionCache = (): void => {
  cancelScheduledResume();
  resumePointerEventsFreeze();
  cache = null;
  hoveredIframe = null;
};
