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
  return (
    rootNode instanceof ShadowRoot &&
    rootNode.host.hasAttribute("data-react-grab")
  );
};

const isUserIgnoredElement = (element: Element): boolean =>
  element.hasAttribute(USER_IGNORE_ATTRIBUTE) ||
  element.closest(`[${USER_IGNORE_ATTRIBUTE}]`) !== null;

// HACK: Dev tools like react-scan create full-viewport canvas overlays with
// pointer-events: none that document.elementsFromPoint() still returns.
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

const isFullViewportOverlay = (
  element: Element,
  computedStyle: CSSStyleDeclaration,
): boolean => {
  const position = computedStyle.position;
  if (position !== "fixed" && position !== "absolute") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const coversViewport =
    rect.width / window.innerWidth >= VIEWPORT_COVERAGE_THRESHOLD &&
    rect.height / window.innerHeight >= VIEWPORT_COVERAGE_THRESHOLD;

  if (!coversViewport) {
    return false;
  }

  const backgroundColor = computedStyle.backgroundColor;
  const hasInvisibleBackground =
    backgroundColor === "transparent" ||
    backgroundColor === "rgba(0, 0, 0, 0)" ||
    parseFloat(computedStyle.opacity) < 0.1;

  if (hasInvisibleBackground) {
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
    if (isFullViewportOverlay(element, computedStyle)) {
      return false;
    }
  }

  visibilityCache.set(element, { isVisible: true, timestamp: now });

  return true;
};
