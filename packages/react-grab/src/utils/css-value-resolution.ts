import { FONT_SIZE_LINE_HEIGHT_RATIO, OPACITY_PERCENT_MAX } from "../constants.js";
import { roundEditableNumericValue } from "./format-css-value.js";
import { parseNumericValue, type NumericValue } from "./parse-numeric-value.js";
import {
  ALIGNED_VALUE_TOLERANCE_PX,
  FALLBACK_ZERO_PX,
  UNITLESS_KEYS,
  type StyleSnapshot,
  type TrackedProperty,
} from "./property-definitions.js";

export const valueWithFallback = (
  snapshot: StyleSnapshot,
  property: TrackedProperty,
): NumericValue | null => {
  const directValue = parseNumericValue(snapshot[property]);
  if (directValue) return directValue;

  if (property === "line-height") {
    const fontSize = parseNumericValue(snapshot["font-size"]);
    if (!fontSize) return null;
    return {
      value: roundEditableNumericValue(fontSize.value * FONT_SIZE_LINE_HEIGHT_RATIO),
      unit: fontSize.unit || "px",
    };
  }

  if (FALLBACK_ZERO_PX.has(property)) return { value: 0, unit: "px" };
  return null;
};

export const alignedValue = (
  snapshot: StyleSnapshot,
  properties: readonly TrackedProperty[],
): NumericValue | null => {
  // valueWithFallback so gap-family longhands with "normal" resolve to 0px
  // (matching their historic behavior in the per-property path). For
  // padding/margin/radius the computed style is always "<n>px", so
  // valueWithFallback delegates to parseNumericValue with no behavior change.
  const firstValue = valueWithFallback(snapshot, properties[0]);
  if (!firstValue) return null;
  for (let propertyIndex = 1; propertyIndex < properties.length; propertyIndex++) {
    const nextValue = valueWithFallback(snapshot, properties[propertyIndex]);
    if (
      !nextValue ||
      nextValue.unit !== firstValue.unit ||
      Math.abs(nextValue.value - firstValue.value) >= ALIGNED_VALUE_TOLERANCE_PX
    ) {
      return null;
    }
  }
  return firstValue;
};

export const normalizeForEdit = (propertyKey: string, value: NumericValue): NumericValue => {
  if (propertyKey === "opacity") {
    return { value: Math.round(value.value * OPACITY_PERCENT_MAX), unit: "%" };
  }
  if (UNITLESS_KEYS.has(propertyKey)) {
    return { value: roundEditableNumericValue(value.value), unit: "" };
  }
  return { value: roundEditableNumericValue(value.value), unit: value.unit || "px" };
};
