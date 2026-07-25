import type { OverlayBounds } from "../types.js";
import { BOUNDS_CACHE_TTL_MS } from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";

interface CachedTextNodeBounds {
  bounds: OverlayBounds;
  timestamp: number;
}

interface TextNodeBoundsAnchor {
  rectCount: number;
  rectIndex: number;
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
  boundsAnchorByTextNode.set(textNode, { rectCount, rectIndex });
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
  if (cached && now - cached.timestamp < BOUNDS_CACHE_TTL_MS) {
    return cached.bounds;
  }

  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  const rects = range.getClientRects();
  const boundsAnchor = boundsAnchorByTextNode.get(textNode);
  let rect: DOMRect | undefined;
  if (boundsAnchor && rects.length > 0) {
    const previousMaximumIndex = Math.max(0, boundsAnchor.rectCount - 1);
    const currentMaximumIndex = rects.length - 1;
    const normalizedRectIndex =
      previousMaximumIndex === 0 ? 0 : boundsAnchor.rectIndex / previousMaximumIndex;
    const currentRectIndex = Math.round(normalizedRectIndex * currentMaximumIndex);
    rect = rects[currentRectIndex];
    boundsAnchor.rectCount = rects.length;
    boundsAnchor.rectIndex = currentRectIndex;
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
