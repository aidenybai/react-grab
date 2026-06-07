export interface PropNumericBounds {
  min: number;
  max: number;
  step: number;
}

// Sensible ranges/steps for the prop names users actually tune on motion
// and three.js components, keyed by the leaf prop name. This is the "good
// API" that lets a bare `opacity` slider snap 0–1 by 0.05 while a
// `duration` slider runs 0–10s by 0.1. Unknown keys fall back to a range
// derived from the live value.
const PROP_NUMERIC_BOUNDS_BY_KEY: Record<string, PropNumericBounds> = {
  opacity: { min: 0, max: 1, step: 0.05 },
  progress: { min: 0, max: 1, step: 0.01 },
  bounce: { min: 0, max: 1, step: 0.05 },
  // Negative scale is valid (it mirrors), so the floor is symmetric.
  scale: { min: -3, max: 3, step: 0.05 },
  scalex: { min: -3, max: 3, step: 0.05 },
  scaley: { min: -3, max: 3, step: 0.05 },
  scalez: { min: -3, max: 3, step: 0.05 },
  rotate: { min: -360, max: 360, step: 1 },
  rotatex: { min: -360, max: 360, step: 1 },
  rotatey: { min: -360, max: 360, step: 1 },
  rotatez: { min: -360, max: 360, step: 1 },
  skew: { min: -90, max: 90, step: 1 },
  skewx: { min: -90, max: 90, step: 1 },
  skewy: { min: -90, max: 90, step: 1 },
  x: { min: -500, max: 500, step: 1 },
  y: { min: -500, max: 500, step: 1 },
  z: { min: -500, max: 500, step: 1 },
  duration: { min: 0, max: 10, step: 0.1 },
  delay: { min: 0, max: 10, step: 0.1 },
  repeatdelay: { min: 0, max: 10, step: 0.1 },
  repeat: { min: 0, max: 10, step: 1 },
  stiffness: { min: 0, max: 1000, step: 10 },
  damping: { min: 0, max: 100, step: 1 },
  mass: { min: 0, max: 10, step: 0.1 },
  velocity: { min: -1000, max: 1000, step: 10 },
  count: { min: 0, max: 500, step: 1 },
  speed: { min: 0, max: 10, step: 0.1 },
  size: { min: 0, max: 100, step: 0.5 },
  radius: { min: 0, max: 100, step: 1 },
  intensity: { min: 0, max: 10, step: 0.1 },
};

const VALUE_RANGE_MULTIPLIER = 4;
const MIN_DERIVED_RANGE = 10;

const deriveBounds = (value: number): PropNumericBounds => {
  if (value > 0 && value <= 1) return { min: 0, max: 1, step: 0.05 };
  const magnitude = Math.max(Math.abs(value) * VALUE_RANGE_MULTIPLIER, MIN_DERIVED_RANGE);
  const step = Number.isInteger(value) ? 1 : 0.1;
  return {
    min: value < 0 ? -Math.ceil(magnitude) : 0,
    max: Math.ceil(magnitude),
    step,
  };
};

export const propNumericBounds = (path: readonly string[], value: number): PropNumericBounds => {
  const leafKey = path[path.length - 1]?.toLowerCase() ?? "";
  return PROP_NUMERIC_BOUNDS_BY_KEY[leafKey] ?? deriveBounds(value);
};
