import { EDIT_COLOR_LIGHTNESS_STEP_PERCENT, EDIT_SHIFT_STEP_MULTIPLIER } from "../../constants.js";
import type { EditableProperty } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { roundEditableNumericValue } from "../../utils/format-css-value.js";
import { stepColorLightness } from "../../utils/parse-color.js";
import { pickNextOption } from "../../utils/pick-next-option.js";
import { stepTailwindShade } from "../../utils/tailwind-palette.js";
import { arePropertyValuesEqual } from "./property-values-equal.js";

export const stepProperty = (
  property: EditableProperty,
  direction: 1 | -1,
  shift: boolean,
): number | string | null => {
  if (property.kind === "color") {
    const next = shift
      ? stepTailwindShade(property.value, direction)
      : stepColorLightness(property.value, EDIT_COLOR_LIGHTNESS_STEP_PERCENT * direction);
    if (!next || arePropertyValuesEqual(property, next, property.value)) return null;
    return next;
  }
  if (property.kind === "enum") {
    const next = pickNextOption(property.options, property.value, direction);
    return next?.value ?? null;
  }
  const multiplier = shift ? EDIT_SHIFT_STEP_MULTIPLIER : 1;
  const candidate = roundEditableNumericValue(
    clampToRange(property.value + direction * multiplier, property.min, property.max),
  );
  return candidate === property.value ? null : candidate;
};
