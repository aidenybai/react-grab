import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../../types.js";

export const isEnumProperty = (property: EditableProperty): property is EnumEditableProperty =>
  property.kind === "enum";

export const narrowNumeric = (property: EditableProperty): NumericEditableProperty | null =>
  property.kind === "numeric" ? property : null;

export const narrowColor = (property: EditableProperty): ColorEditableProperty | null =>
  property.kind === "color" ? property : null;

export const narrowEnum = (property: EditableProperty): EnumEditableProperty | null =>
  property.kind === "enum" ? property : null;
