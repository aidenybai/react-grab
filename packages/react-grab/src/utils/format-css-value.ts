import {
  CSS_VALUE_DECIMAL_PLACES,
  EDIT_STEP_SNAP_EPSILON,
  OPACITY_PERCENT_MAX,
} from "../constants.js";
import type { EditableProperty } from "../types.js";

const ROUND_FACTOR = 10 ** CSS_VALUE_DECIMAL_PLACES;

const roundToDecimals = (value: number): number =>
  Number.isInteger(value) ? value : Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;

const stripTrailingZeros = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(CSS_VALUE_DECIMAL_PLACES).replace(/\.?0+$/, "");
};

export const formatDisplayValue = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  return stripTrailingZeros(roundToDecimals(value));
};

// Snaps a runtime numeric value to the nearest `step`. CSS rows pass the
// default step of 1, which rounds to a whole number — the store form for
// everything CSS we tweak. Two reasons to round to integer instead of
// just trimming FP noise via roundToDecimals:
//   - slider drag computes continuous values from cursor x; without
//     this the UI shows `padding: 16.42px` which is never what users
//     want for layout values
//   - browsers occasionally report sub-pixel computed style
//     ("1860.6000000000004px"); rounding to integer cleans that too
// Prop rows pass fractional steps (e.g. opacity 0.05, duration 0.1) so
// animation values keep the precision the user actually wants. Snapping
// to the step grid (rather than free FP) keeps `0.65` from drifting to
// `0.6500000000000001` after arithmetic.
export const roundEditableNumericValue = (value: number, step = 1): number => {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  // `value / step` carries IEEE-754 error, which at an exact half-step
  // boundary can flip the rounding direction (0.35 / 0.1 = 3.4999… rounds
  // to 3, not 4). A relative nudge far smaller than any real step gap
  // restores round-half-up without affecting genuinely off-grid values.
  const quotient = value / safeStep;
  const nudged = quotient + (quotient < 0 ? -EDIT_STEP_SNAP_EPSILON : EDIT_STEP_SNAP_EPSILON);
  return roundToDecimals(Math.round(nudged) * safeStep);
};

export const formatEditableValue = (
  property: EditableProperty,
  overrideValue?: number | string,
): string => {
  if (property.kind === "color" || property.kind === "enum") {
    const stringValue = typeof overrideValue === "string" ? overrideValue : property.value;
    return stringValue;
  }
  const numericValue = typeof overrideValue === "number" ? overrideValue : property.value;
  if (property.key === "opacity" && property.unit === "%") {
    return stripTrailingZeros(roundToDecimals(numericValue / OPACITY_PERCENT_MAX));
  }
  return `${stripTrailingZeros(roundToDecimals(numericValue))}${property.unit}`;
};
