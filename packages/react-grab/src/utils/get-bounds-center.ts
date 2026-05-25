import type { OverlayBounds, Position } from "../types.js";

export const getBoundsCenter = (bounds: OverlayBounds): Position => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});
