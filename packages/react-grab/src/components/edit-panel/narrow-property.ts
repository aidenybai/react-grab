import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableProperty,
  NumericEditableProperty,
  TextEditableProperty,
} from "../../types.js";

export const narrowNumeric = (property: EditableProperty): NumericEditableProperty | null =>
  property.kind === "numeric" ? property : null;

export const narrowColor = (property: EditableProperty): ColorEditableProperty | null =>
  property.kind === "color" ? property : null;

export const narrowEnum = (property: EditableProperty): EnumEditableProperty | null =>
  property.kind === "enum" ? property : null;

export const narrowText = (property: EditableProperty): TextEditableProperty | null =>
  property.kind === "text" ? property : null;
