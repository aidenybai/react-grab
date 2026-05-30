import type {
  ColorEditableProperty,
  EnumEditableOption,
  EnumEditableProperty,
  NumericEditableProperty,
  TextEditableProperty,
} from "../types.js";
import { propertyBounds } from "./css-property-bounds.js";
import { normalizeForEdit } from "./css-value-resolution.js";
import { parseAnyColor } from "./parse-any-color.js";
import { parseHexChannels } from "./parse-color.js";
import type { NumericValue } from "./parse-numeric-value.js";
import {
  type AggregateDefinition,
  type EnumPropertyDefinition,
  TEXT_CONTENT_KEY,
} from "./property-definitions.js";
import { tailwindAliasesForProperty } from "./tailwind-class-map.js";

export const buildNumericProperty = (
  definition: AggregateDefinition,
  rawValue: NumericValue,
  isCanonical: boolean,
): NumericEditableProperty => {
  const normalized = normalizeForEdit(definition.key, rawValue);
  const bounds = propertyBounds(definition.key, normalized.value, normalized.unit);
  return {
    kind: "numeric",
    key: definition.key,
    label: definition.label,
    cssProperties: definition.longhands,
    min: bounds.min,
    max: bounds.max,
    value: normalized.value,
    original: normalized.value,
    unit: normalized.unit,
    tailwindAliases: tailwindAliasesForProperty(definition.key),
    isPrioritized: false,
    isDefault: false,
    isCanonical,
  };
};

export const buildTextProperty = (textValue: string): TextEditableProperty => ({
  kind: "text",
  key: TEXT_CONTENT_KEY,
  label: "text",
  cssProperties: [],
  value: textValue,
  original: textValue,
  tailwindAliases: [],
  isPrioritized: true,
  isDefault: false,
  isCanonical: true,
});

export const buildColorProperty = (
  cssKey: string,
  label: string,
  rawCssValue: string,
): ColorEditableProperty | null => {
  const hexValue = parseAnyColor(rawCssValue);
  if (!hexValue) return null;
  const channels = parseHexChannels(hexValue);
  if (!channels || channels.a === 0) return null;
  return {
    kind: "color",
    key: cssKey,
    label,
    cssProperties: [cssKey],
    value: hexValue,
    original: hexValue,
    tailwindAliases: tailwindAliasesForProperty(cssKey),
    isPrioritized: false,
    isDefault: false,
    isCanonical: true,
  };
};

export const buildEnumProperty = (
  definition: EnumPropertyDefinition,
  rawCssValue: string,
  overrideOptions?: ReadonlyArray<EnumEditableOption>,
): EnumEditableProperty | null => {
  const trimmedCssValue = rawCssValue.trim();
  const options = overrideOptions ?? definition.options;
  if (!options) return null;
  if (!options.some((option) => option.value === trimmedCssValue)) return null;
  return {
    kind: "enum",
    key: definition.key,
    label: definition.label,
    cssProperties: [definition.key],
    value: trimmedCssValue,
    original: trimmedCssValue,
    options,
    tailwindAliases: tailwindAliasesForProperty(definition.key),
    isPrioritized: false,
    isDefault: false,
    isCanonical: true,
  };
};
