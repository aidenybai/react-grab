import type { LinearTransform } from "../types";

export const parseScaleLinear = (value: string | undefined): LinearTransform | null => {
  if (!value || value === "none") return null;
  const factors = value
    .trim()
    .split(/\s+/)
    .map((token) => Number.parseFloat(token));
  if (factors.length < 1 || factors.length > 3) return null;
  if (factors.some((factor) => !Number.isFinite(factor))) return null;
  const scaleX = factors[0];
  const scaleY = factors.length >= 2 ? factors[1] : factors[0];
  return { a: scaleX, b: 0, c: 0, d: scaleY };
};
