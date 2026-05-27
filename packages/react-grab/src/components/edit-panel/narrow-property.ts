import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../../types.js";

export const asNumeric = (property: EditableProperty): NumericEditableProperty =>
  property as NumericEditableProperty;
export const asColor = (property: EditableProperty): ColorEditableProperty =>
  property as ColorEditableProperty;
export const asEnum = (property: EditableProperty): EnumEditableProperty =>
  property as EnumEditableProperty;
