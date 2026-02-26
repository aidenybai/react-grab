import type { OverlayBounds } from "../types.js";
import { getBoundsCenter } from "./get-bounds-center.js";

interface Position {
  x: number;
  y: number;
}

interface RecalculateSessionPositionOptions {
  currentPosition: Position;
  previousBounds: OverlayBounds | undefined;
  nextBounds: OverlayBounds | undefined;
}

export const recalculateSessionPosition = ({
  currentPosition,
  previousBounds,
  nextBounds,
}: RecalculateSessionPositionOptions): Position => {
  if (!previousBounds || !nextBounds) {
    return currentPosition;
  }

  const previousBoundsCenter = getBoundsCenter(previousBounds);
  const nextBoundsCenter = getBoundsCenter(nextBounds);
  const previousBoundsHalfWidth = previousBounds.width / 2;
  const positionOffsetFromCenterX = currentPosition.x - previousBoundsCenter.x;
  const positionOffsetRatio =
    previousBoundsHalfWidth > 0
      ? positionOffsetFromCenterX / previousBoundsHalfWidth
      : 0;
  const nextBoundsHalfWidth = nextBounds.width / 2;

  return {
    ...currentPosition,
    x: nextBoundsCenter.x + positionOffsetRatio * nextBoundsHalfWidth,
  };
};
