import type { OverlayBounds } from "../types.js";
import {
  stripTranslateFromMatrix,
  stripTranslateFromTransformString,
} from "./strip-translate-from-transform.js";
import {
  BOUNDS_CACHE_TTL_MS,
  MAX_TRANSFORM_ANCESTOR_DEPTH,
  TRANSFORM_EARLY_BAIL_DEPTH,
} from "../constants.js";

interface CachedBounds {
  bounds: OverlayBounds;
  timestamp: number;
}

let boundsCache = new WeakMap<Element, CachedBounds>();

export const invalidateBoundsCache = () => {
  boundsCache = new WeakMap<Element, CachedBounds>();
};

const getAccumulatedTransform = (
  element: Element,
  selfTransform: string,
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
    const transformValue = window.getComputedStyle(current).transform;
    if (transformValue && transformValue !== "none") {
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

export const createElementBounds = (element: Element): OverlayBounds => {
  const now = performance.now();
  const cached = boundsCache.get(element);

  if (cached && now - cached.timestamp < BOUNDS_CACHE_TTL_MS) {
    return cached.bounds;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const transform = getAccumulatedTransform(element, style.transform);

  let bounds: OverlayBounds;

  if (transform !== "none" && element instanceof HTMLElement) {
    const ow = element.offsetWidth;
    const oh = element.offsetHeight;

    if (ow > 0 && oh > 0) {
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;

      bounds = {
        borderRadius: style.borderRadius || "0px",
        height: oh,
        transform,
        width: ow,
        x: cx - ow * 0.5,
        y: cy - oh * 0.5,
      };
    } else {
      bounds = {
        borderRadius: style.borderRadius || "0px",
        height: rect.height,
        transform,
        width: rect.width,
        x: rect.left,
        y: rect.top,
      };
    }
  } else {
    bounds = {
      borderRadius: style.borderRadius || "0px",
      height: rect.height,
      transform,
      width: rect.width,
      x: rect.left,
      y: rect.top,
    };
  }

  boundsCache.set(element, { bounds, timestamp: now });
  return bounds;
};
