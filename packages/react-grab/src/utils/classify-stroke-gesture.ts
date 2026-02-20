import type { StrokePoint, DragRect } from "../types.js";

export type StrokeGesture = "circle" | "arrow";

const computeAngularSweep = (points: StrokePoint[]): number => {
  if (points.length < 3) return 0;

  let centroidX = 0;
  let centroidY = 0;
  for (const point of points) {
    centroidX += point.x;
    centroidY += point.y;
  }
  centroidX /= points.length;
  centroidY /= points.length;

  let totalAngleChange = 0;
  let previousAngle = Math.atan2(
    points[0].y - centroidY,
    points[0].x - centroidX,
  );

  for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
    const currentAngle = Math.atan2(
      points[pointIndex].y - centroidY,
      points[pointIndex].x - centroidX,
    );
    let angleDelta = currentAngle - previousAngle;

    while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

    totalAngleChange += angleDelta;
    previousAngle = currentAngle;
  }

  return Math.abs(totalAngleChange);
};

export const classifyStrokeGesture = (
  points: StrokePoint[],
  minAngularSweepRad: number,
): StrokeGesture => {
  if (points.length < 5) return "arrow";

  const angularSweep = computeAngularSweep(points);
  if (angularSweep >= minAngularSweepRad) {
    return "circle";
  }

  return "arrow";
};

export const computeStrokeBoundingRect = (
  points: StrokePoint[],
): DragRect => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
