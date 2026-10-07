import type { Rect } from "../types.js";

// Splits every rect around the hole, producing up to four pieces per input
// (above, below, left, right of the overlap). Used to build a pointer shield
// that covers the viewport except where an element must stay interactive.
export const subtractRect = (rects: readonly Rect[], hole: Rect): Rect[] => {
  const remainingRects: Rect[] = [];

  for (const rect of rects) {
    const overlapLeft = Math.max(rect.left, hole.left);
    const overlapTop = Math.max(rect.top, hole.top);
    const overlapRight = Math.min(rect.right, hole.right);
    const overlapBottom = Math.min(rect.bottom, hole.bottom);

    if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
      remainingRects.push(rect);
      continue;
    }

    if (overlapTop > rect.top) {
      remainingRects.push({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: overlapTop,
      });
    }
    if (overlapBottom < rect.bottom) {
      remainingRects.push({
        left: rect.left,
        top: overlapBottom,
        right: rect.right,
        bottom: rect.bottom,
      });
    }
    if (overlapLeft > rect.left) {
      remainingRects.push({
        left: rect.left,
        top: overlapTop,
        right: overlapLeft,
        bottom: overlapBottom,
      });
    }
    if (overlapRight < rect.right) {
      remainingRects.push({
        left: overlapRight,
        top: overlapTop,
        right: rect.right,
        bottom: overlapBottom,
      });
    }
  }

  return remainingRects;
};
