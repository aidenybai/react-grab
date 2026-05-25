import type { Position } from "../types.js";

/** Translate client coordinates to page coordinates by adding the window scroll. */
export const toPageCoordinates = (clientX: number, clientY: number) => ({
  pageX: clientX + window.scrollX,
  pageY: clientY + window.scrollY,
});

/**
 * Distance (absolute) between `dragStart` (in page coordinates) and the
 * current pointer (in client coordinates).
 */
export const calculateDragDistance = (
  dragStart: Position,
  endClientX: number,
  endClientY: number,
) => {
  const { pageX: endPageX, pageY: endPageY } = toPageCoordinates(endClientX, endClientY);
  return {
    x: Math.abs(endPageX - dragStart.x),
    y: Math.abs(endPageY - dragStart.y),
  };
};

/**
 * Drag rectangle in client coordinates spanning from `dragStart` (page) to
 * the current pointer (client). Negative-direction drags are normalized so
 * the rectangle always has positive width/height.
 */
export const calculateDragRectangle = (
  dragStart: Position,
  endClientX: number,
  endClientY: number,
) => {
  const { pageX: endPageX, pageY: endPageY } = toPageCoordinates(endClientX, endClientY);

  const dragPageX = Math.min(dragStart.x, endPageX);
  const dragPageY = Math.min(dragStart.y, endPageY);
  const dragWidth = Math.abs(endPageX - dragStart.x);
  const dragHeight = Math.abs(endPageY - dragStart.y);

  return {
    x: dragPageX - window.scrollX,
    y: dragPageY - window.scrollY,
    width: dragWidth,
    height: dragHeight,
  };
};
