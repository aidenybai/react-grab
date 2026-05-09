import type { OverlayBounds, Position } from "../types.js";

export const isPositionInsideBounds = (position: Position, bounds: OverlayBounds) =>
  position.x >= bounds.x &&
  position.x <= bounds.x + bounds.width &&
  position.y >= bounds.y &&
  position.y <= bounds.y + bounds.height;
