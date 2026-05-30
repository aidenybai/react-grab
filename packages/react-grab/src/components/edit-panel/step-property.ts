import { EDIT_COLOR_LIGHTNESS_STEP_PERCENT, EDIT_SHIFT_STEP_MULTIPLIER } from "../../constants.js";
import type { EditableProperty } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { roundEditableNumericValue } from "../../utils/format-css-value.js";
import { stepColorLightness } from "../../utils/parse-color.js";
import { pickNextOption } from "../../utils/pick-next-option.js";
import { stepTailwindShade } from "../../utils/tailwind-palette.js";
import { arePropertyValuesEqual } from "./property-values-equal.js";

// A fully-transparent row means "no color"; step from opaque so arrows
// produce a visible color instead of nudging an invisible one.
const opaqueStepBase = (hex: string): string =>
  hex.length === 9 && hex.slice(7).toLowerCase() === "00" ? hex.slice(0, 7) : hex;

export const stepProperty = (
  property: EditableProperty,
  direction: 1 | -1,
  shift: boolean,
): number | string | null => {
  if (property.kind === "color") {
    const baseColor = opaqueStepBase(property.value);
    const next = shift
      ? stepTailwindShade(baseColor, direction)
      : stepColorLightness(baseColor, EDIT_COLOR_LIGHTNESS_STEP_PERCENT * direction);
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
