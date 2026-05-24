import type { NumericEditableProperty } from "../types.js";

// Tailwind v3 default spacing scale in pixels. Covers padding, margin,
// gap, width, height, font-size, line-height, border-radius,
// border-width — any px-unit length property snaps to these.
const SPACING_SCALE_PX = [
  0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64,
  80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 384,
] as const;

// Tailwind v3 opacity scale (0–100). Stops every 5 above 20 and at 0/5/10
// so opacity 100 → 95 → 90 etc. feels predictable.
const OPACITY_SCALE = [
  0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100,
] as const;

const scaleForProperty = (property: NumericEditableProperty): ReadonlyArray<number> | null => {
  if (property.key === "opacity") return OPACITY_SCALE;
  if (property.unit === "px") return SPACING_SCALE_PX;
  return null;
};

// Returns the next stop in the requested direction from the current
// value. direction = 1 picks the smallest stop strictly greater than the
// value; direction = -1 picks the largest stop strictly less. Returns
// null when no further stop exists (caller can decide whether to fall
// back to a regular numeric step).
export const stepTailwindNumeric = (
  property: NumericEditableProperty,
  direction: 1 | -1,
): number | null => {
  const scale = scaleForProperty(property);
  if (!scale) return null;
  if (direction === 1) {
    for (const stop of scale) {
      if (stop > property.value) return stop;
    }
    return null;
  }
  for (let index = scale.length - 1; index >= 0; index--) {
    if (scale[index] < property.value) return scale[index];
  }
  return null;
};
