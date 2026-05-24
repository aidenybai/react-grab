import { CSS_VALUE_DECIMAL_PLACES, OPACITY_PERCENT_MAX } from "../constants.js";
import type { EditableProperty } from "../types.js";

const ROUND_FACTOR = 10 ** CSS_VALUE_DECIMAL_PLACES;

const roundToDecimals = (value: number): number =>
  Number.isInteger(value) ? value : Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;

const stripTrailingZeros = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(CSS_VALUE_DECIMAL_PLACES).replace(/\.?0+$/, "");
};

// Rounds to CSS_VALUE_DECIMAL_PLACES and strips trailing zeros for display
// in the panel UI ("16" not "16.00", "12.5" not "12.5000").
export const formatDisplayValue = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  return stripTrailingZeros(roundToDecimals(value));
};

// Snaps a runtime numeric value (e.g. computed-style sub-pixel like
// 1860.6000000000004) to a clean rounded representation we can compare
// against and write back as a CSS value.
export const cleanNumericValue = (value: number): number => roundToDecimals(value);

// Formats an editable property's value as a CSS-injectable string,
// applying property-specific transforms (opacity goes from 0-100 UI to
// 0-1 CSS).
export const formatEditableValue = (
  property: EditableProperty,
  value: number = property.value,
): string => {
  if (property.key === "opacity" && property.unit === "%") {
    return stripTrailingZeros(roundToDecimals(value / OPACITY_PERCENT_MAX));
  }
  return `${stripTrailingZeros(roundToDecimals(value))}${property.unit}`;
};
