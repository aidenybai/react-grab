import type { LinearTransform } from "../types";

export const multiplyLinearTransforms = (
  outer: LinearTransform,
  inner: LinearTransform,
): LinearTransform => ({
  a: outer.a * inner.a + outer.c * inner.b,
  b: outer.b * inner.a + outer.d * inner.b,
  c: outer.a * inner.c + outer.c * inner.d,
  d: outer.b * inner.c + outer.d * inner.d,
});
