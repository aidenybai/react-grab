import type { OverlayBounds } from "../types.js";
import {
  stripTranslateFromMatrix,
  stripTranslateFromTransformString,
} from "./strip-translate-from-transform.js";
import {
  BOUNDS_CACHE_TTL_MS,
  BORDER_RADIUS_CACHE_TTL_MS,
  MAX_TRANSFORM_ANCESTOR_DEPTH,
  TRANSFORM_EARLY_BAIL_DEPTH,
} from "../constants.js";

interface CachedBounds {
  bounds: OverlayBounds;
  timestamp: number;
}

interface CachedTransform {
  transform: string;
  timestamp: number;
}

interface CachedBorderRadius {
  borderRadius: string;
  timestamp: number;
}

let boundsCache = new WeakMap<Element, CachedBounds>();
let ancestorTransformCache = new WeakMap<Element, CachedTransform>();
let borderRadiusCache = new WeakMap<Element, CachedBorderRadius>();

export const invalidateBoundsCache = () => {
  boundsCache = new WeakMap<Element, CachedBounds>();
  ancestorTransformCache = new WeakMap<Element, CachedTransform>();
  borderRadiusCache = new WeakMap<Element, CachedBorderRadius>();
};

export const populateBoundsCache = (
  element: Element,
  bounds: OverlayBounds,
) => {
  boundsCache.set(element, { bounds, timestamp: performance.now() });
};

const getAncestorTransformValue = (ancestor: Element, now: number): string => {
  const cached = ancestorTransformCache.get(ancestor);
  if (cached && now - cached.timestamp < BOUNDS_CACHE_TTL_MS) {
    return cached.transform;
  }

  const transformValue = window.getComputedStyle(ancestor).transform;
  const resolvedTransform =
    transformValue && transformValue !== "none" ? transformValue : "none";
  ancestorTransformCache.set(ancestor, {
    transform: resolvedTransform,
    timestamp: now,
  });
  return resolvedTransform;
};

const getAccumulatedTransform = (
  element: Element,
  selfTransform: string,
  now: number,
): string => {
  const hasSelfTransform = selfTransform && selfTransform !== "none";

  let accumulated: DOMMatrix | null = null;
  let current = element.parentElement;
  let depth = 0;

  while (
    current &&
    current !== document.documentElement &&
    depth < MAX_TRANSFORM_ANCESTOR_DEPTH
  ) {
    const transformValue = getAncestorTransformValue(current, now);
    if (transformValue !== "none") {
      accumulated = accumulated
        ? new DOMMatrix(transformValue).multiply(accumulated)
        : new DOMMatrix(transformValue);
    } else if (
      !hasSelfTransform &&
      !accumulated &&
      depth >= TRANSFORM_EARLY_BAIL_DEPTH
    ) {
      return "none";
    }
    current = current.parentElement;
    depth++;
  }

  if (!accumulated) {
    return hasSelfTransform
      ? stripTranslateFromTransformString(selfTransform)
      : "none";
  }

  if (hasSelfTransform) {
    accumulated = accumulated.multiply(new DOMMatrix(selfTransform));
  }

  return stripTranslateFromMatrix(accumulated);
};

const getCachedBorderRadius = (
  element: Element,
  computedStyle: CSSStyleDeclaration | null,
  now: number,
): string => {
  const cached = borderRadiusCache.get(element);
  if (cached && now - cached.timestamp < BORDER_RADIUS_CACHE_TTL_MS) {
    return cached.borderRadius;
  }

  const style = computedStyle ?? window.getComputedStyle(element);
  const borderRadius = style.borderRadius || "0px";
  borderRadiusCache.set(element, { borderRadius, timestamp: now });
  return borderRadius;
};

const buildBoundsFromRect = (
  element: Element,
  rect: DOMRect,
  style: CSSStyleDeclaration,
  now: number,
): OverlayBounds => {
  const transform = getAccumulatedTransform(element, style.transform, now);
  const borderRadius = getCachedBorderRadius(element, style, now);

  // For transformed elements we use offsetWidth/offsetHeight to recover the
  // untransformed dimensions. For example, a 100x100 div rotated 45 degrees
  // has a ~141x141 bounding rect, but the overlay needs the original 100x100
  // size paired with a separate CSS rotate transform.
  if (transform !== "none" && element instanceof HTMLElement) {
    const offsetWidth = element.offsetWidth;
    const offsetHeight = element.offsetHeight;

    if (offsetWidth > 0 && offsetHeight > 0) {
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      return {
        borderRadius,
        height: offsetHeight,
        transform,
        width: offsetWidth,
        x: centerX - offsetWidth * 0.5,
        y: centerY - offsetHeight * 0.5,
      };
    }
  }

  return {
    borderRadius,
    height: rect.height,
    transform,
    width: rect.width,
    x: rect.left,
    y: rect.top,
  };
};

export const createBoundsFromIOEntry = (
  element: Element,
  entryRect: DOMRect,
): OverlayBounds => {
  const now = performance.now();
  const style = window.getComputedStyle(element);
  return buildBoundsFromRect(element, entryRect, style, now);
};

export const createElementBounds = (element: Element): OverlayBounds => {
  const now = performance.now();
  const cached = boundsCache.get(element);

  if (cached && now - cached.timestamp < BOUNDS_CACHE_TTL_MS) {
    return cached.bounds;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const bounds = buildBoundsFromRect(element, rect, style, now);

  boundsCache.set(element, { bounds, timestamp: now });
  return bounds;
};
