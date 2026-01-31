import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import {
  ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX,
  ELEMENT_POSITION_THROTTLE_MS,
} from "../constants.js";

interface PositionCache {
  clientX: number;
  clientY: number;
  element: Element | null;
  timestamp: number;
}

let cache: PositionCache | null = null;

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
): Element[] => document.elementsFromPoint(clientX, clientY);

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

  const elementsAtPoint = getElementsAtPoint(clientX, clientY);

  let result: Element | null = null;
  for (const candidateElement of elementsAtPoint) {
    if (isValidGrabbableElement(candidateElement)) {
      result = candidateElement;
      break;
    }
  }

  cache = { clientX, clientY, element: result, timestamp: now };
  return result;
};

export const clearElementPositionCache = (): void => {
  cache = null;
};
