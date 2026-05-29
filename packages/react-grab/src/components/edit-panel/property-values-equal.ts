import type { EditableProperty } from "../../types.js";

export const arePropertyValuesEqual = (
  property: EditableProperty,
  nextValue: number | string,
  previousValue: number | string,
): boolean => {
  if (
    property.kind === "color" &&
    typeof nextValue === "string" &&
    typeof previousValue === "string"
  ) {
    return nextValue.toLowerCase() === previousValue.toLowerCase();
  }
  return nextValue === previousValue;
};
