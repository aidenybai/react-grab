import { SCROLL_ROOM_EPSILON_PX } from "../constants.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";

const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"]);

const canScrollAxis = (
  overflow: string,
  scrollPosition: number,
  clientSize: number,
  scrollSize: number,
  delta: number,
): boolean => {
  if (!SCROLLABLE_OVERFLOW_VALUES.has(overflow)) return false;
  if (delta < 0) return scrollPosition > SCROLL_ROOM_EPSILON_PX;
  return scrollPosition + clientSize < scrollSize - SCROLL_ROOM_EPSILON_PX;
};

// Mirrors the browser's scroll chain for a wheel event that the hit-test shield
// intercepted: the nearest ancestor that scrolls the wheeled axis and still has
// room left in that direction. Returns null when nothing but the page itself can
// scroll, which lets the caller leave the native (compositor-driven) page scroll
// alone instead of emulating it on the main thread.
export const findScrollableAncestor = (
  element: Element,
  deltaX: number,
  deltaY: number,
): Element | null => {
  let current: Element | null = element;

  while (current) {
    const hasVerticalOverflow = deltaY !== 0 && current.scrollHeight > current.clientHeight;
    const hasHorizontalOverflow = deltaX !== 0 && current.scrollWidth > current.clientWidth;
    // getComputedStyle is the expensive half, so overflowing size gates it.
    if (hasVerticalOverflow || hasHorizontalOverflow) {
      const style = getComputedStyle(current);
      if (
        hasVerticalOverflow &&
        canScrollAxis(
          style.overflowY,
          current.scrollTop,
          current.clientHeight,
          current.scrollHeight,
          deltaY,
        )
      ) {
        return current;
      }
      if (
        hasHorizontalOverflow &&
        canScrollAxis(
          style.overflowX,
          current.scrollLeft,
          current.clientWidth,
          current.scrollWidth,
          deltaX,
        )
      ) {
        return current;
      }
    }
    current = getComposedParentElement(current);
  }

  return null;
};
