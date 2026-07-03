import { LINEAR_TRANSFORM_IDENTITY_EPSILON } from "../constants";
import type { LinearTransform } from "../types";

export const isIdentityLinearTransform = (linear: LinearTransform): boolean =>
  Math.abs(linear.a - 1) < LINEAR_TRANSFORM_IDENTITY_EPSILON &&
  Math.abs(linear.b) < LINEAR_TRANSFORM_IDENTITY_EPSILON &&
  Math.abs(linear.c) < LINEAR_TRANSFORM_IDENTITY_EPSILON &&
  Math.abs(linear.d - 1) < LINEAR_TRANSFORM_IDENTITY_EPSILON;
