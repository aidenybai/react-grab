export const clampToRange = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));
