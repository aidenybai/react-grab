import type { OverlayBounds } from "../types.js";
import { BOUNDS_CACHE_TTL_MS } from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";

interface CachedTextNodeBounds {
  bounds: OverlayBounds;
  timestamp: number;
}

interface TextNodeBoundsAnchor {
  normalizedRectIndex: number;
}

let textNodeBoundsCache = new WeakMap<Text, CachedTextNodeBounds>();
const boundsAnchorByTextNode = new WeakMap<Text, TextNodeBoundsAnchor>();

export const invalidateTextNodeBoundsCache = () => {
  textNodeBoundsCache = new WeakMap<Text, CachedTextNodeBounds>();
};

export const setTextNodeBoundsRectIndex = (
  textNode: Text,
  rectIndex: number,
  rectCount: number,
): void => {
  const maximumRectIndex = Math.max(0, rectCount - 1);
  boundsAnchorByTextNode.set(textNode, {
    normalizedRectIndex: maximumRectIndex === 0 ? 0 : rectIndex / maximumRectIndex,
  });
  textNodeBoundsCache.delete(textNode);
};

export const transferTextNodeBoundsRectIndex = (
  previousTextNode: Text,
  nextTextNode: Text,
): void => {
  const boundsAnchor = boundsAnchorByTextNode.get(previousTextNode);
  if (boundsAnchor) {
    boundsAnchorByTextNode.set(nextTextNode, boundsAnchor);
    textNodeBoundsCache.delete(nextTextNode);
  }
};

export const createTextNodeBounds = (textNode: Text): OverlayBounds => {
  const now = performance.now();
  const cached = textNodeBoundsCache.get(textNode);
  if (cached && (textNode.isConnected === false || now - cached.timestamp < BOUNDS_CACHE_TTL_MS)) {
    return cached.bounds;
  }

  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  const rects = range.getClientRects();
  const boundsAnchor = boundsAnchorByTextNode.get(textNode);
  let rect: DOMRect | undefined;
  if (boundsAnchor && rects.length > 0) {
    const currentMaximumIndex = rects.length - 1;
    const currentRectIndex = Math.round(boundsAnchor.normalizedRectIndex * currentMaximumIndex);
    rect = rects[currentRectIndex];
  }
  rect ??= range.getBoundingClientRect();
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
