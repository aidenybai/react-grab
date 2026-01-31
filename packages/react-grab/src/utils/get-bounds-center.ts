import type { OverlayBounds } from "../types.js";

interface BoundsCenter {
  x: number;
  y: number;
}

export const getBoundsCenter = (bounds: OverlayBounds): BoundsCenter => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});
