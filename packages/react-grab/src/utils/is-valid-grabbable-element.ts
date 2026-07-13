import {
  DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD,
  OVERLAY_Z_INDEX_THRESHOLD,
  VIEWPORT_COVERAGE_THRESHOLD,
  VISIBILITY_CACHE_TTL_MS,
} from "../constants.js";
import { isElementVisible } from "./is-element-visible.js";
import { isRootElement } from "./is-root-element.js";
import { getElementComputedStyle } from "./get-element-computed-style.js";
import { isReactGrabElement } from "./is-react-grab-element.js";
import { isUserIgnoredElement } from "./is-user-ignored-element.js";

// Dev tools like react-scan create full-viewport canvas overlays with
// pointer-events:none that elementsFromPoint still returns. Without this
// filter the user would select the invisible overlay instead of the actual
// page content beneath it.
// @see https://github.com/aidenybai/react-grab/issues/148
const isDevToolsOverlay = (computedStyle: CSSStyleDeclaration): boolean => {
  const zIndex = parseInt(computedStyle.zIndex, 10);
  return (
    computedStyle.pointerEvents === "none" &&
    computedStyle.position === "fixed" &&
    !isNaN(zIndex) &&
    zIndex >= DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD
  );
};

const hasTransparentBackground = (computedStyle: CSSStyleDeclaration): boolean => {
  const backgroundColor = computedStyle.backgroundColor;
  return backgroundColor === "transparent" || backgroundColor === "rgba(0, 0, 0, 0)";
};

const isFullViewportOverlay = (computedStyle: CSSStyleDeclaration): boolean => {
  const position = computedStyle.position;
  if (position !== "fixed" && position !== "absolute") return false;

  if (hasTransparentBackground(computedStyle) || parseFloat(computedStyle.opacity) < 0.1) {
    return true;
  }

  const zIndex = parseInt(computedStyle.zIndex, 10);
  return !isNaN(zIndex) && zIndex > OVERLAY_Z_INDEX_THRESHOLD;
};

interface VisibilityCache {
  isVisible: boolean;
  timestamp: number;
}

let visibilityCache = new WeakMap<Element, VisibilityCache>();

// Only for resize paths: media/container queries can flip visibility
// synchronously on resize, so the TTL alone is not a safe staleness bound
// there. Scroll paths must NOT call this — see invalidate-interaction-caches.
export const clearVisibilityCache = (): void => {
  visibilityCache = new WeakMap<Element, VisibilityCache>();
};

export const isValidGrabbableElement = (element: Element): boolean => {
  if (isRootElement(element)) {
    return false;
  }

  if (isReactGrabElement(element)) {
    return false;
  }

  if (isUserIgnoredElement(element)) {
    return false;
  }

  const now = performance.now();
  const cached = visibilityCache.get(element);

  if (cached && now - cached.timestamp < VISIBILITY_CACHE_TTL_MS) {
    return cached.isVisible;
  }

  const isVisible = isElementVisible(element);
  if (!isVisible) {
    visibilityCache.set(element, { isVisible: false, timestamp: now });
    return false;
  }

  const couldBeOverlay =
    element.clientWidth / (element.ownerDocument.defaultView?.innerWidth ?? window.innerWidth) >=
      VIEWPORT_COVERAGE_THRESHOLD &&
    element.clientHeight / (element.ownerDocument.defaultView?.innerHeight ?? window.innerHeight) >=
      VIEWPORT_COVERAGE_THRESHOLD;

  if (couldBeOverlay) {
    // getComputedStyle is deferred to this branch on purpose: it is the
    // expensive call in this function and only viewport-covering elements
    // need the overlay heuristics.
    const computedStyle = getElementComputedStyle(element);
    if (isDevToolsOverlay(computedStyle)) {
      return false;
    }
    if (isFullViewportOverlay(computedStyle)) {
      return false;
    }
  }

  visibilityCache.set(element, { isVisible: true, timestamp: now });

  return true;
};
