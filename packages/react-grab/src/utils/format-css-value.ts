import { CSS_VALUE_DECIMAL_PLACES, OPACITY_PERCENT_MAX } from "../constants.js";
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

// Snaps a runtime numeric value to a whole number — the store form
// for everything we tweak. Two reasons to round to integer instead of
// just trimming FP noise via roundToDecimals:
//   - slider drag computes continuous values from cursor x; without
//     this the UI shows `padding: 16.42px` which is never what users
//     want for layout values
//   - browsers occasionally report sub-pixel computed style
//     ("1860.6000000000004px"); rounding to integer cleans that too
// Sub-percent precision (e.g. opacity 50.5%) is rare enough that the
// loss of one decimal place isn't worth keeping the FP display.
export const cleanNumericValue = (value: number): number => Math.round(value);

export const formatEditableValue = (
  property: EditableProperty,
  overrideValue?: number | string,
): string => {
  if (property.kind === "color" || property.kind === "enum") {
    return (overrideValue as string | undefined) ?? property.value;
  }
  const value = (overrideValue as number | undefined) ?? property.value;
  if (property.key === "opacity" && property.unit === "%") {
    return stripTrailingZeros(roundToDecimals(value / OPACITY_PERCENT_MAX));
  }
  return `${stripTrailingZeros(roundToDecimals(value))}${property.unit}`;
};
