import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../../types.js";

// Narrowing accessors used wherever a non-keyed Solid `<Match>` has
// already gated on `property.kind`. Solid's non-keyed Match doesn't
// carry narrowing across the callback boundary, so we cast through
// these shared helpers (single import, single contract) instead of
// littering call sites with `as Extract<...>`.
export const asNumeric = (property: EditableProperty): NumericEditableProperty =>
  property as NumericEditableProperty;
export const asColor = (property: EditableProperty): ColorEditableProperty =>
  property as ColorEditableProperty;
export const asEnum = (property: EditableProperty): EnumEditableProperty =>
  property as EnumEditableProperty;
