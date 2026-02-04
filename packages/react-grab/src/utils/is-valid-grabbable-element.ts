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

/**
 * Detects dev tools overlay elements that should be ignored during selection.
 *
 * Dev tools like react-scan create full-viewport canvas overlays to highlight
 * re-rendering components. These canvases use pointer-events: none so clicks
 * pass through, but document.elementsFromPoint() still returns them.
 *
 * react-scan's canvas styles (from outline-overlay.ts):
 *   position: fixed; top: 0; left: 0;
 *   pointer-events: none;
 *   z-index: 2147483600;
 *
 * @see https://github.com/aidenybai/react-grab/issues/148
 */
const isNonInteractiveOverlay = (
  computedStyle: CSSStyleDeclaration,
): boolean => {
  const zIndex = parseInt(computedStyle.zIndex, 10);
  const DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD = 2147483600;
  return (
    computedStyle.pointerEvents === "none" &&
    computedStyle.position === "fixed" &&
    !isNaN(zIndex) &&
    zIndex >= DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD
  );
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

  if (isNonInteractiveOverlay(computedStyle)) {
    return false;
  }

  const isVisible = isElementVisible(element, computedStyle);

  visibilityCache.set(element, { isVisible, timestamp: now });

  return isVisible;
};
