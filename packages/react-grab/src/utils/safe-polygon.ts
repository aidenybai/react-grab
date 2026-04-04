import type { Position } from "../types.js";

// Implements the "Amazon menu" safe-triangle pattern: when the cursor leaves a
// menu trigger, a triangle is drawn from the cursor position to the far edge of
// the dropdown, and the dropdown stays open while the cursor remains inside that
// triangle. This prevents accidental dismissal during diagonal mouse movement.
// @see https://bjk5.com/post/44698559168

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const computeTriangleSign = (point1: Position, point2: Position, point3: Position): number =>
  (point1.x - point3.x) * (point2.y - point3.y) - (point2.x - point3.x) * (point1.y - point3.y);

const isPositionInTriangle = (
  point: Position,
  vertex1: Position,
  vertex2: Position,
  vertex3: Position,
): boolean => {
  const sign1 = computeTriangleSign(point, vertex1, vertex2);
  const sign2 = computeTriangleSign(point, vertex2, vertex3);
  const sign3 = computeTriangleSign(point, vertex3, vertex1);
  const hasNegative = sign1 < 0 || sign2 < 0 || sign3 < 0;
  const hasPositive = sign1 > 0 || sign2 > 0 || sign3 > 0;
  return !hasNegative || !hasPositive;
};

const isPositionInRect = (point: Position, rect: TargetRect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

const computeFarEdgeCorners = (cursor: Position, targetRect: TargetRect): [Position, Position] => {
  const targetBottom = targetRect.y + targetRect.height;
  const targetRight = targetRect.x + targetRect.width;

  if (cursor.y <= targetRect.y) {
    return [
      { x: targetRect.x, y: targetBottom },
      { x: targetRight, y: targetBottom },
    ];
  }
  if (cursor.y >= targetBottom) {
    return [
      { x: targetRect.x, y: targetRect.y },
      { x: targetRight, y: targetRect.y },
    ];
  }
  if (cursor.x <= targetRect.x) {
    return [
      { x: targetRight, y: targetRect.y },
      { x: targetRight, y: targetBottom },
    ];
  }
  return [
    { x: targetRect.x, y: targetRect.y },
    { x: targetRect.x, y: targetBottom },
  ];
};

export const createSafePolygonTracker = () => {
  let removeListener: (() => void) | null = null;

  const stop = () => {
    removeListener?.();
    removeListener = null;
  };

  const start = (
    cursorPosition: Position,
    targetRects: TargetRect[],
    onLeavePolygon: () => void,
  ) => {
    stop();

    const primaryTarget = targetRects[0];
    if (!primaryTarget) return;

    if (isPositionInRect(cursorPosition, primaryTarget)) return;

    const [corner1, corner2] = computeFarEdgeCorners(cursorPosition, primaryTarget);

    const isInAnySafeRect = (point: Position): boolean =>
      targetRects.some((rect) => isPositionInRect(point, rect));

    const handleMouseMove = (event: MouseEvent) => {
      const cursor = { x: event.clientX, y: event.clientY };

      if (isInAnySafeRect(cursor)) {
        if (isPositionInRect(cursor, primaryTarget)) {
          stop();
        }
        return;
      }

      if (isPositionInTriangle(cursor, cursorPosition, corner1, corner2)) {
        return;
      }

      stop();
      onLeavePolygon();
    };

    window.addEventListener("mousemove", handleMouseMove);
    removeListener = () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  };

  return { start, stop };
};
