import type { ElementTransformStyleValues, LinearTransform } from "../types";
import { multiplyLinearTransforms } from "./multiply-linear-transforms";
import { parseRotateLinear } from "./parse-rotate-linear";
import { parseScaleLinear } from "./parse-scale-linear";
import { parseTransformMatrix } from "./parse-transform-matrix";

const IDENTITY_LINEAR_TRANSFORM: LinearTransform = { a: 1, b: 0, c: 0, d: 1 };

export const composeElementLinearTransform = (
  transformValues: ElementTransformStyleValues,
): LinearTransform => {
  let composed =
    parseTransformMatrix(transformValues.transform) ?? IDENTITY_LINEAR_TRANSFORM;
  const scaleLinear = parseScaleLinear(transformValues.scale);
  if (scaleLinear) composed = multiplyLinearTransforms(scaleLinear, composed);
  const rotateLinear = parseRotateLinear(transformValues.rotate);
  if (rotateLinear) composed = multiplyLinearTransforms(rotateLinear, composed);
  return composed;
};
