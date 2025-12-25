import type { OverlayBounds } from "../types.js";

export const getBoundsCenter = (bounds: OverlayBounds) => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});
