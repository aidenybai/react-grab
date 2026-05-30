import { EDIT_SHIFT_STEP_MULTIPLIER } from "../../constants.js";
import type { EditableProperty } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { roundEditableNumericValue } from "../../utils/format-css-value.js";
import { pickNextOption } from "../../utils/pick-next-option.js";

// Colors are edited via the picker (arrows open it), so only enum and
// numeric rows step here.
export const stepProperty = (
  property: EditableProperty,
  direction: 1 | -1,
  shift: boolean,
): number | string | null => {
  if (property.kind === "enum") {
    const next = pickNextOption(property.options, property.value, direction);
    return next?.value ?? null;
  }
  if (property.kind !== "numeric") return null;
  const multiplier = shift ? EDIT_SHIFT_STEP_MULTIPLIER : 1;
  const candidate = roundEditableNumericValue(
    clampToRange(property.value + direction * multiplier, property.min, property.max),
  );
  return candidate === property.value ? null : candidate;
};
