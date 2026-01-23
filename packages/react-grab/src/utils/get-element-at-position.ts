import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

const CACHE_DISTANCE_THRESHOLD_PX = 2;
const THROTTLE_INTERVAL_MS = 16;

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
    deltaX <= CACHE_DISTANCE_THRESHOLD_PX &&
    deltaY <= CACHE_DISTANCE_THRESHOLD_PX
  );
};

export const getElementsAtPoint = (
  clientX: number,
  clientY: number,
): Element[] => document.elementsFromPoint(clientX, clientY);

export const getElementsAbove = (element: Element): Element[] => {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const elementsAtPoint = getElementsAtPoint(centerX, centerY);
  const elementIndex = elementsAtPoint.indexOf(element);

  if (elementIndex === -1) return [];

  return elementsAtPoint.slice(0, elementIndex);
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
    const isWithinThrottle = now - cache.timestamp < THROTTLE_INTERVAL_MS;

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
