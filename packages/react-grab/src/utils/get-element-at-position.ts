import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import {
  ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX,
  ELEMENT_POSITION_THROTTLE_MS,
  POINTER_EVENTS_RESUME_DEBOUNCE_MS,
} from "../constants.js";
import {
  suspendPointerEventsFreeze,
  resumePointerEventsFreeze,
} from "./freeze-pseudo-states.js";
import { createElementBounds } from "./create-element-bounds.js";

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

const isWithinThreshold = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean => {
  const deltaX = Math.abs(x1 - x2);
  const deltaY = Math.abs(y1 - y2);
  return (
    deltaX <= ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX &&
    deltaY <= ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX
  );
};

export const getElementsAtPoint = (
  clientX: number,
  clientY: number,
): Element[] => {
  cancelScheduledResume();
  suspendPointerEventsFreeze();
  const elements = document.elementsFromPoint(clientX, clientY);
  scheduleResume();
  return elements;
};

export const getElementAtPosition = (
  clientX: number,
  clientY: number,
): Element | null => {
  const now = performance.now();

  if (cache) {
    const isPositionClose = isWithinThreshold(
      clientX,
      clientY,
      cache.clientX,
      cache.clientY,
    );
    const isWithinThrottle =
      now - cache.timestamp < ELEMENT_POSITION_THROTTLE_MS;

    if (isPositionClose || isWithinThrottle) {
      return cache.element;
    }
  }

  cancelScheduledResume();
  suspendPointerEventsFreeze();

  let result: Element | null = null;

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

  if (result) {
    createElementBounds(result);
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
