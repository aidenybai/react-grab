import type { OverlayBounds } from "../types.js";

export const areBoundsEqual = (a: OverlayBounds, b: OverlayBounds): boolean =>
  a.x === b.x &&
  a.y === b.y &&
  a.width === b.width &&
  a.height === b.height &&
  a.borderRadius === b.borderRadius &&
  a.transform === b.transform;
