import {
  IGNORE_EVENTS_ATTRIBUTE,
  VISIBILITY_CACHE_TTL_MS,
} from "../constants.js";
import { isElementVisible } from "./is-element-visible.js";
import { ATTRIBUTE_NAME } from "./mount-root.js";

const REACT_GRAB_SELECTOR = `[${ATTRIBUTE_NAME}], [${IGNORE_EVENTS_ATTRIBUTE}]`;

interface VisibilityCache {
  isVisible: boolean;
  timestamp: number;
}

let visibilityCache = new WeakMap<Element, VisibilityCache>();

export const clearVisibilityCache = (): void => {
  visibilityCache = new WeakMap<Element, VisibilityCache>();
};

export const isValidGrabbableElement = (element: Element): boolean => {
  if (element.closest(REACT_GRAB_SELECTOR)) {
    return false;
  }

  const now = performance.now();
  const cached = visibilityCache.get(element);

  if (cached && now - cached.timestamp < VISIBILITY_CACHE_TTL_MS) {
    return cached.isVisible;
  }

  const computedStyle = window.getComputedStyle(element);
  const isVisible = isElementVisible(element, computedStyle);

  visibilityCache.set(element, { isVisible, timestamp: now });

  return isVisible;
};
