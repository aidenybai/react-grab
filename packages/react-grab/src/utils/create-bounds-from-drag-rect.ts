import type { OverlayBounds } from "../types.js";

interface DragRectWithPageCoords {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

interface BaseBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createBoundsFromDragRect = (
  dragRect: DragRectWithPageCoords,
): OverlayBounds => ({
  x: dragRect.pageX - window.scrollX,
  y: dragRect.pageY - window.scrollY,
  width: dragRect.width,
  height: dragRect.height,
  borderRadius: "0px",
  transform: "none",
});

export const createPageRectFromBounds = (
  bounds: BaseBounds,
): DragRectWithPageCoords => ({
  pageX: bounds.x + window.scrollX,
  pageY: bounds.y + window.scrollY,
  width: bounds.width,
  height: bounds.height,
});

export const createFlatOverlayBounds = (bounds: BaseBounds): OverlayBounds => ({
  ...bounds,
  borderRadius: "0px",
  transform: "none",
});
