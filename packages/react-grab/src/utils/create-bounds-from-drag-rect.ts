import type { OverlayBounds } from "../types.js";

// All OverlayBounds factories use the same property insertion order
// (borderRadius, height, transform, width, x, y) so V8 sees one hidden class
// across every consumer (getBoundsCenter, overlay-canvas effects, label
// positioning). Mixed orders here caused recurring "wrong map" deopts in
// hot bounds paths.

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

export const createBoundsFromDragRect = (dragRect: DragRectWithPageCoords): OverlayBounds => ({
  borderRadius: "0px",
  height: dragRect.height,
  transform: "none",
  width: dragRect.width,
  x: dragRect.pageX - window.scrollX,
  y: dragRect.pageY - window.scrollY,
});

export const createPageRectFromBounds = (bounds: BaseBounds): DragRectWithPageCoords => ({
  pageX: bounds.x + window.scrollX,
  pageY: bounds.y + window.scrollY,
  width: bounds.width,
  height: bounds.height,
});

export const createFlatOverlayBounds = (bounds: BaseBounds): OverlayBounds => ({
  borderRadius: "0px",
  height: bounds.height,
  transform: "none",
  width: bounds.width,
  x: bounds.x,
  y: bounds.y,
});
