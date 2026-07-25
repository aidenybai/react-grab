import type { OverlayBounds } from "../types.js";
import { BOUNDS_CACHE_TTL_MS } from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";

interface CachedTextNodeBounds {
  bounds: OverlayBounds;
  timestamp: number;
}

let textNodeBoundsCache = new WeakMap<Text, CachedTextNodeBounds>();

export const invalidateTextNodeBoundsCache = () => {
  textNodeBoundsCache = new WeakMap<Text, CachedTextNodeBounds>();
};

export const createTextNodeBounds = (textNode: Text): OverlayBounds => {
  const now = performance.now();
  const cached = textNodeBoundsCache.get(textNode);
  if (cached && now - cached.timestamp < BOUNDS_CACHE_TTL_MS) {
    return cached.bounds;
  }

  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  const rect = range.getBoundingClientRect();
  const topWindowPosition = convertClientPositionToTopWindow(
    textNode.ownerDocument.defaultView,
    rect.left,
    rect.top,
  );

  const bounds: OverlayBounds = {
    borderRadius: "0px",
    height: rect.height * topWindowPosition.scaleY,
    width: rect.width * topWindowPosition.scaleX,
    x: topWindowPosition.x,
    y: topWindowPosition.y,
  };

  textNodeBoundsCache.set(textNode, { bounds, timestamp: now });
  return bounds;
};
