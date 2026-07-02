import {
  COMPARATIVE_BASE_RATIO,
  COMPARATIVE_LENGTH_FLOOR_PX,
  COMPARATIVE_OPACITY_FLOOR_PERCENT,
  COMPARATIVE_UNITLESS_FLOOR,
  COMPARATIVE_Z_INDEX_FLOOR,
} from "../constants.js";
import type { EditableProperty, NumericEditableProperty } from "../types.js";
import { clampToRange } from "./clamp-to-range.js";
import { roundEditableNumericValue } from "./format-css-value.js";

const floorStep = (property: NumericEditableProperty): number => {
  if (property.key === "opacity") return COMPARATIVE_OPACITY_FLOOR_PERCENT;
  if (property.key === "z-index") return COMPARATIVE_Z_INDEX_FLOOR;
  if (property.unit === "px") return COMPARATIVE_LENGTH_FLOOR_PX;
  return COMPARATIVE_UNITLESS_FLOOR;
};

// Comparative edits are computed from the property's panel-open baseline so
// re-typing the same phrase converges instead of compounding. Ordinal enums
// (font-weight) step through their options; numeric rows move by the larger of
// a proportional nudge and a per-unit floor, scaled by intensity.
export const computeComparativeValue = (
  property: EditableProperty,
  direction: 1 | -1,
  magnitude: number,
): number | string | null => {
  if (property.kind === "enum") {
    const currentIndex = property.options.findIndex((option) => option.value === property.value);
    if (currentIndex === -1) return null;
    const steps = Math.max(1, Math.round(magnitude));
    const targetIndex = clampToRange(
      currentIndex + direction * steps,
      0,
      property.options.length - 1,
    );
    const nextValue = property.options[targetIndex].value;
    return nextValue === property.value ? null : nextValue;
  }
  if (property.kind !== "numeric") return null;

  const proportionalDelta = Math.abs(property.value) * COMPARATIVE_BASE_RATIO;
  const unitDelta = Math.max(proportionalDelta, floorStep(property)) * magnitude;
  const candidate = property.value + direction * unitDelta;
  const nextValue = roundEditableNumericValue(clampToRange(candidate, property.min, property.max));
  return nextValue === property.value ? null : nextValue;
};
