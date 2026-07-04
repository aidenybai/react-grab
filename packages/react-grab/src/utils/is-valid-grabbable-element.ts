import {
  DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD,
  OVERLAY_Z_INDEX_THRESHOLD,
  USER_IGNORE_ATTRIBUTE,
  VIEWPORT_COVERAGE_THRESHOLD,
  VISIBILITY_CACHE_TTL_MS,
} from "../constants.js";
import { isElementVisible } from "./is-element-visible.js";
import { isRootElement } from "./is-root-element.js";

// Checks both the library and demo host attributes (not just this build's
// REACT_GRAB_ATTRIBUTE_NAME): when a real instance and the demo build coexist
// on one page (each with its own host), neither may treat the other's overlay
// as grabbable page content.
const REACT_GRAB_HOST_ATTRIBUTES = ["data-react-grab", "data-react-grab-demo"];

export const hasReactGrabAttribute = (element: Element): boolean =>
  REACT_GRAB_HOST_ATTRIBUTES.some((attribute) => element.hasAttribute(attribute));

const isReactGrabElement = (element: Element): boolean => {
  if (hasReactGrabAttribute(element)) return true;

  const rootNode = element.getRootNode();
  return rootNode instanceof ShadowRoot && hasReactGrabAttribute(rootNode.host);
};

const isUserIgnoredElement = (element: Element): boolean =>
  element.hasAttribute(USER_IGNORE_ATTRIBUTE) ||
  element.closest(`[${USER_IGNORE_ATTRIBUTE}]`) !== null;

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

  const computedStyle = window.getComputedStyle(element);

  const isVisible = isElementVisible(element, computedStyle);
  if (!isVisible) {
    visibilityCache.set(element, { isVisible: false, timestamp: now });
    return false;
  }

  const couldBeOverlay =
    element.clientWidth / window.innerWidth >= VIEWPORT_COVERAGE_THRESHOLD &&
    element.clientHeight / window.innerHeight >= VIEWPORT_COVERAGE_THRESHOLD;

  if (couldBeOverlay) {
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
