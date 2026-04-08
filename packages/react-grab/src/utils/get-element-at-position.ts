import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import {
  ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX,
  ELEMENT_POSITION_THROTTLE_MS,
  POINTER_EVENTS_RESUME_DEBOUNCE_MS,
} from "../constants.js";
import { suspendPointerEventsFreeze, resumePointerEventsFreeze } from "./freeze-pseudo-states.js";

interface PositionCache {
  clientX: number;
  clientY: number;
  element: Element | null;
  timestamp: number;
}

let cache: PositionCache | null = null;
let resumeTimerId: ReturnType<typeof setTimeout> | null = null;

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

export const getElementAtPosition = (clientX: number, clientY: number): Element | null => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const now = performance.now();

  if (cache) {
    const isPositionClose = isWithinThreshold(clientX, clientY, cache.clientX, cache.clientY);
    const isWithinThrottle = now - cache.timestamp < ELEMENT_POSITION_THROTTLE_MS;

    if (isPositionClose && isWithinThrottle) {
      return cache.element;
    }
  }

  // PERF: suspendPointerEventsFreeze toggles the html { pointer-events: none }
  // stylesheet, which dirties the entire style tree. elementFromPoint then forces
  // a Recalculate Style. The 100ms debounced resume (scheduleResume) ensures the
  // toggle is a no-op on rapid subsequent calls. The expensive recalc on those
  // calls comes from host-page CSS animations dirtying styles between frames,
  // which is unavoidable without removing pointer-events: none entirely.
  // Alternatives explored and rejected:
  //   - IntersectionObserver pre-population: adds 1-frame latency to every poll
  //   - event.target fast path: always html/document due to pointer-events: none
  //   - bounds-check cache: ignores z-index/stacking, causes hover detection misses
  //   - transparent overlay instead of pointer-events: none: leaks CSS-only :hover
  //     dropdowns/tooltips during the hit-test toggle
  cancelScheduledResume();
  suspendPointerEventsFreeze();

  let result: Element | null = null;

  // elementFromPoint returns the topmost element, but if it's not grabbable
  // (e.g. a transparent overlay) we fall back to elementsFromPoint which
  // returns the full z-ordered stack at that coordinate.
  const topElement = document.elementFromPoint(clientX, clientY);
  if (topElement && isValidGrabbableElement(topElement)) {
    result = topElement;
  } else {
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
    for (const candidateElement of elementsAtPoint) {
      if (candidateElement !== topElement && isValidGrabbableElement(candidateElement)) {
        result = candidateElement;
        break;
      }
    }
  }

  scheduleResume();

  cache = { clientX, clientY, element: result, timestamp: now };
  return result;
};

export const clearElementPositionCache = (): void => {
  cancelScheduledResume();
  resumePointerEventsFreeze();
  cache = null;
};
