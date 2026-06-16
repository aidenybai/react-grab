import {
  ANNOTATION_STROKE_SIZE_PX,
  ANNOTATION_STROKE_SMOOTHING,
  ANNOTATION_STROKE_STREAMLINE,
  ANNOTATION_STROKE_THINNING,
} from "../constants.js";
import type { AnnotationStroke } from "../types.js";
import { getStroke, type Vec2 } from "./perfect-freehand.js";

// Join each outline point to the midpoint of the next with a quadratic curve -
// the midpoint smoothing perfect-freehand recommends for filled output.
const buildPath2DFromOutline = (outline: Vec2[]): Path2D => {
  const path = new Path2D();
  if (outline.length === 0) return path;

  const [firstX, firstY] = outline[0];
  path.moveTo(firstX, firstY);

  for (let index = 0; index < outline.length; index++) {
    const [currentX, currentY] = outline[index];
    const [nextX, nextY] = outline[(index + 1) % outline.length];
    path.quadraticCurveTo(currentX, currentY, (currentX + nextX) / 2, (currentY + nextY) / 2);
  }

  path.closePath();
  return path;
};

export const getAnnotationStrokePath = (stroke: AnnotationStroke, isComplete: boolean): Path2D =>
  buildPath2DFromOutline(
    getStroke(stroke.points, {
      size: ANNOTATION_STROKE_SIZE_PX,
      thinning: ANNOTATION_STROKE_THINNING,
      smoothing: ANNOTATION_STROKE_SMOOTHING,
      streamline: ANNOTATION_STROKE_STREAMLINE,
      last: isComplete,
    }),
  );
