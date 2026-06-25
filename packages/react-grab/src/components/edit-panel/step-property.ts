import { EDIT_SHIFT_STEP_MULTIPLIER } from "../../constants.js";
import type { DesignTokenResolver, EditableProperty } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { roundEditableNumericValue } from "../../utils/format-css-value.js";
import { pickNextOption } from "../../utils/pick-next-option.js";

// Colors are edited via the picker (arrows open it), so only enum and
// numeric rows step here.
export const stepProperty = (
  property: EditableProperty,
  direction: 1 | -1,
  shift: boolean,
  designTokens?: DesignTokenResolver,
): number | string | null => {
  if (property.kind === "enum") {
    const next = pickNextOption(property.options, property.value, direction);
    return next?.value ?? null;
  }
  if (property.kind !== "numeric") return null;

  // Widen the range to include out-of-range originals (text-9xl is
  // 128px against a 96px font-size cap) so the first step nudges from
  // the real value instead of teleporting to the clamp bound —
  // possibly against the pressed direction.
  const lowerBound = Math.min(property.min, property.value);
  const upperBound = Math.max(property.max, property.value);

  // A plain arrow on a px property walks the project's token scale so values
  // snap through the design system; Shift keeps the coarse raw step, and an
  // off-scale value falls through to the raw step below so it never dead-ends.
  if (!shift && property.unit === "px" && designTokens?.hasTokens) {
    const tokenStep = designTokens.stepLength(property.value, direction, property.cssProperties[0]);
    if (tokenStep !== null) {
      const clampedTokenStep = roundEditableNumericValue(
        clampToRange(tokenStep, lowerBound, upperBound),
      );
      if (clampedTokenStep !== property.value) return clampedTokenStep;
    }
  }

  const multiplier = shift ? EDIT_SHIFT_STEP_MULTIPLIER : 1;
  const candidate = roundEditableNumericValue(
    clampToRange(property.value + direction * multiplier, lowerBound, upperBound),
  );
  return candidate === property.value ? null : candidate;
};
