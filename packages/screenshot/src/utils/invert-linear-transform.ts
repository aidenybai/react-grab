import type { LinearTransform } from "../types";

export const invertLinearTransform = (linear: LinearTransform): LinearTransform | null => {
  const determinant = linear.a * linear.d - linear.b * linear.c;
  if (determinant === 0) return null;
  return {
    a: linear.d / determinant,
    b: -linear.b / determinant,
    c: -linear.c / determinant,
    d: linear.a / determinant,
  };
};
