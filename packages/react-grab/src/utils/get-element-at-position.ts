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

const getElementArea = (element: Element): number => {
  const blockWidth = element.clientWidth;
  const blockHeight = element.clientHeight;
  if (blockWidth > 0 && blockHeight > 0) return blockWidth * blockHeight;
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
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

    if (isPositionClose || isWithinThrottle) {
      return cache.element;
    }
  }

  if (isElementAtPointIndexReady()) {
    const spatialResult = queryElementAtPointIndex(clientX, clientY);
    if (spatialResult) {
      cache = { clientX, clientY, element: spatialResult, timestamp: now };
      return spatialResult;
    }
  }

  cancelScheduledResume();
  suspendPointerEventsFreeze();

  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
  let result: Element | null = null;

  for (const candidateElement of elementsAtPoint) {
    if (!isValidGrabbableElement(candidateElement)) continue;
    if (getElementArea(candidateElement) === 0) continue;
    result = candidateElement;
    break;
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
