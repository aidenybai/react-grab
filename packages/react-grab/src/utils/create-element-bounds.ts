import type { OverlayBounds } from "../types.js";
import { BOUNDS_CACHE_TTL_MS, BORDER_RADIUS_CACHE_TTL_MS } from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";
import { getElementComputedStyle } from "./get-element-computed-style.js";
import { scaleBorderRadius } from "./scale-border-radius.js";
import { getElementAdapter } from "../core/element-adapter.js";

interface CachedBounds {
  bounds: OverlayBounds;
  timestamp: number;
}

interface CachedBorderRadius {
  borderRadius: string;
  timestamp: number;
}

let boundsCache = new WeakMap<Element, CachedBounds>();
let borderRadiusCache = new WeakMap<Element, CachedBorderRadius>();

export const invalidateBoundsCache = () => {
  boundsCache = new WeakMap<Element, CachedBounds>();
  borderRadiusCache = new WeakMap<Element, CachedBorderRadius>();
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

  const style = computedStyle ?? getElementComputedStyle(element);
  const borderRadius = style.borderRadius || "0px";
  borderRadiusCache.set(element, { borderRadius, timestamp: now });
  return borderRadius;
};

export const createElementBounds = (element: Element): OverlayBounds => {
  const now = performance.now();
  const cached = boundsCache.get(element);

  if (cached && now - cached.timestamp < BOUNDS_CACHE_TTL_MS) {
    return cached.bounds;
  }

  const adapter = getElementAdapter(element);
  if (adapter) {
    const bounds = adapter.getBounds();
    boundsCache.set(element, { bounds, timestamp: now });
    return bounds;
  }

  const rect = element.getBoundingClientRect();
  const topWindowPosition = convertClientPositionToTopWindow(
    element.ownerDocument.defaultView,
    rect.left,
    rect.top,
  );
  const borderRadius = scaleBorderRadius(
    getCachedBorderRadius(element, null, now),
    topWindowPosition.scaleX,
    topWindowPosition.scaleY,
  );
  const bounds: OverlayBounds = {
    borderRadius,
    height: rect.height * topWindowPosition.scaleY,
    width: rect.width * topWindowPosition.scaleX,
    x: topWindowPosition.x,
    y: topWindowPosition.y,
  };

  boundsCache.set(element, { bounds, timestamp: now });
  return bounds;
};
