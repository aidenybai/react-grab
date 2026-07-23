import type { HostBounds } from "react-grab/targets";

export const getRelativeBounds = (
  bounds: HostBounds,
  parentBounds: HostBounds | null,
): HostBounds => ({
  ...bounds,
  x: bounds.x - (parentBounds?.x ?? 0),
  y: bounds.y - (parentBounds?.y ?? 0),
});
