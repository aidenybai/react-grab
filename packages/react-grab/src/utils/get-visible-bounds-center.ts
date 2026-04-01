import type { OverlayBounds, Position } from "../types.js";

export const getVisibleBoundsCenter = (bounds: OverlayBounds): Position => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const visibleLeft = Math.max(0, bounds.x);
  const visibleRight = Math.min(viewportWidth, bounds.x + bounds.width);
  const visibleTop = Math.max(0, bounds.y);
  const visibleBottom = Math.min(viewportHeight, bounds.y + bounds.height);

  return {
    x: (visibleLeft + visibleRight) / 2,
    y: (visibleTop + visibleBottom) / 2,
  };
};
