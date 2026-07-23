import type { HostBounds } from "react-grab/targets";

export const getRelativeBounds = (
  bounds: HostBounds,
  parentBounds: HostBounds | null,
): HostBounds | null =>
  parentBounds
    ? {
        ...bounds,
        x: bounds.x - parentBounds.x,
        y: bounds.y - parentBounds.y,
      }
    : null;
