import {
  DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD,
  OVERLAY_Z_INDEX_THRESHOLD,
  USER_IGNORE_ATTRIBUTE,
  VIEWPORT_COVERAGE_THRESHOLD,
  VISIBILITY_CACHE_TTL_MS,
} from "../constants.js";
import { isElementVisible } from "./is-element-visible.js";
import { isRootElement } from "./is-root-element.js";

const isReactGrabElement = (element: Element): boolean => {
  if (element.hasAttribute("data-react-grab")) return true;

  const rootNode = element.getRootNode();
  return rootNode instanceof ShadowRoot && rootNode.host.hasAttribute("data-react-grab");
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

interface GrabbableCache {
  isGrabbable: boolean;
  timestamp: number;
}

let visibilityCache = new WeakMap<Element, GrabbableCache>();

export const clearVisibilityCache = (): void => {
  visibilityCache = new WeakMap<Element, GrabbableCache>();
};

const computeIsGrabbable = (element: Element): boolean => {
  if (isRootElement(element)) {
    return false;
  }

  if (isReactGrabElement(element)) {
    return false;
  }

  if (isUserIgnoredElement(element)) {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);

  if (!isElementVisible(element, computedStyle)) {
    return false;
  }

  const couldBeOverlay =
    element.clientWidth / window.innerWidth >= VIEWPORT_COVERAGE_THRESHOLD &&
    element.clientHeight / window.innerHeight >= VIEWPORT_COVERAGE_THRESHOLD;

  if (couldBeOverlay && (isDevToolsOverlay(computedStyle) || isFullViewportOverlay(computedStyle))) {
    return false;
  }

  return true;
};

export const isValidGrabbableElement = (element: Element): boolean => {
  // Cache the full decision (including the structural checks' ancestor walk and
  // the getComputedStyle) so a hit short-circuits before any of it runs. A miss
  // always writes back, so overlay rejections are cached too.
  const now = performance.now();
  const cached = visibilityCache.get(element);

  if (cached && now - cached.timestamp < VISIBILITY_CACHE_TTL_MS) {
    return cached.isGrabbable;
  }

  const isGrabbable = computeIsGrabbable(element);
  visibilityCache.set(element, { isGrabbable, timestamp: now });
  return isGrabbable;
};
