import type { EnumEditableOption } from "../types.js";

// Returns the option at `+direction` from the currently selected value,
// wrapping at the ends. Returns null when the options list is empty or
// when the step lands on the same value (so callers can early-out).
export const pickNextOption = (
  options: ReadonlyArray<EnumEditableOption>,
  currentValue: string,
  direction: 1 | -1,
): EnumEditableOption | null => {
  if (options.length === 0) return null;
  const currentIndex = options.findIndex((option) => option.value === currentValue);
  const baseIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = (baseIndex + direction + options.length) % options.length;
  const next = options[nextIndex];
  if (!next || next.value === currentValue) return null;
  return next;
};
