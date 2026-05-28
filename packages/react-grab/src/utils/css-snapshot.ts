import { FONT_SIZE_LINE_HEIGHT_RATIO, OPACITY_PERCENT_MAX } from "../constants.js";
import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableOption,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../types.js";
import { cleanNumericValue } from "./format-css-value.js";
import { rgbStringToHex } from "./parse-color.js";
import { parseNumericValue, type NumericValue } from "./parse-numeric-value.js";
import {
  ALIGNED_VALUE_TOLERANCE_PX,
  ALL_BASELINE_KEYS,
  FALLBACK_ZERO_PX,
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  LETTER_SPACING_MAX_PX,
  LETTER_SPACING_MIN_PX,
  LINE_HEIGHT_MAX_PX,
  LINE_HEIGHT_MIN_PX,
  MARGIN_MIN_PX,
  OPACITY_MIN_PERCENT,
  PERCENT_RANGE_MAX,
  PERCENT_RANGE_MIN,
  POSITION_KEYS,
  POSITION_MAX_PX,
  POSITION_MIN_PX,
  RADIUS_MAX_PX,
  RADIUS_MIN_PX,
  SIZE_FALLBACK_MAX_PX,
  SIZE_FALLBACK_MULTIPLIER,
  SPACING_MAX_PX,
  SPACING_MIN_PX,
  TRACKED_PROPERTIES,
  UNITLESS_KEYS,
  Z_INDEX_MAX,
  Z_INDEX_MIN,
  type AggregateDefinition,
  type StyleSnapshot,
  type TrackedProperty,
} from "./property-definitions.js";
import { tailwindAliasesForProperty } from "./tailwind-class-map.js";

export type ComputedSnapshot = Record<string, string>;

export const snapshotElement = (element: Element): StyleSnapshot => {
  const computed = getComputedStyle(element);
  const snapshot = {} as StyleSnapshot;
  for (const property of TRACKED_PROPERTIES) {
    snapshot[property] = computed.getPropertyValue(property);
  }
  return snapshot;
};

export const valueWithFallback = (
  snapshot: StyleSnapshot,
  property: TrackedProperty,
): NumericValue | null => {
  const direct = parseNumericValue(snapshot[property]);
  if (direct) return direct;

  if (property === "line-height") {
    const fontSize = parseNumericValue(snapshot["font-size"]);
    if (!fontSize) return null;
    return {
      value: cleanNumericValue(fontSize.value * FONT_SIZE_LINE_HEIGHT_RATIO),
      unit: fontSize.unit || "px",
    };
  }

  if (FALLBACK_ZERO_PX.has(property)) return { value: 0, unit: "px" };
  return null;
};

export const alignedValue = (
  snapshot: StyleSnapshot,
  properties: readonly TrackedProperty[],
): NumericValue | null => {
  // valueWithFallback so gap-family longhands with "normal" resolve to 0px
  // (matching their historic behavior in the per-property path). For
  // padding/margin/radius the computed style is always "<n>px", so
  // valueWithFallback delegates to parseNumericValue with no behavior change.
  const first = valueWithFallback(snapshot, properties[0]);
  if (!first) return null;
  for (let index = 1; index < properties.length; index++) {
    const next = valueWithFallback(snapshot, properties[index]);
    if (
      !next ||
      next.unit !== first.unit ||
      Math.abs(next.value - first.value) >= ALIGNED_VALUE_TOLERANCE_PX
    ) {
      return null;
    }
  }
  return first;
};

export const propertyBounds = (
  key: string,
  value: number,
  unit: string,
): { min: number; max: number } => {
  if (key === "opacity") return { min: OPACITY_MIN_PERCENT, max: OPACITY_PERCENT_MAX };
  if (key === "z-index") return { min: Z_INDEX_MIN, max: Z_INDEX_MAX };
  if (key === "letter-spacing") {
    return { min: LETTER_SPACING_MIN_PX, max: LETTER_SPACING_MAX_PX };
  }
  if (key === "font-size") return { min: FONT_SIZE_MIN_PX, max: FONT_SIZE_MAX_PX };
  if (key === "line-height") return { min: LINE_HEIGHT_MIN_PX, max: LINE_HEIGHT_MAX_PX };
  if (key.includes("radius")) return { min: RADIUS_MIN_PX, max: RADIUS_MAX_PX };
  if (key === "width" || key === "height" || key.startsWith("max-")) {
    return {
      min: 0,
      max: Math.max(SIZE_FALLBACK_MAX_PX, Math.ceil(value * SIZE_FALLBACK_MULTIPLIER)),
    };
  }
  // Positioning (top/right/bottom/left and their inset aggregates) needs
  // the negative half — overlays often live at `top: -8px` etc.
  if (POSITION_KEYS.has(key)) return { min: POSITION_MIN_PX, max: POSITION_MAX_PX };
  if (unit === "%") return { min: PERCENT_RANGE_MIN, max: PERCENT_RANGE_MAX };
  return {
    min: key.startsWith("margin") ? MARGIN_MIN_PX : SPACING_MIN_PX,
    max: SPACING_MAX_PX,
  };
};

export const normalizeForEdit = (key: string, value: NumericValue): NumericValue => {
  if (key === "opacity") {
    return { value: Math.round(value.value * OPACITY_PERCENT_MAX), unit: "%" };
  }
  if (UNITLESS_KEYS.has(key)) {
    return { value: cleanNumericValue(value.value), unit: "" };
  }
  return { value: cleanNumericValue(value.value), unit: value.unit || "px" };
};

export const snapshotAllKeys = (computed: CSSStyleDeclaration): ComputedSnapshot => {
  const snapshot: ComputedSnapshot = {};
  for (const key of ALL_BASELINE_KEYS) {
    snapshot[key] = computed.getPropertyValue(key);
  }
  return snapshot;
};

// Measure the baseline by inserting a styling-free clone of the same
// tag as a sibling of the target, snapshotting computed style, then
// removing it. Same-parent placement makes inherited properties
// (font-size, color) compare apples-to-apples; display:none keeps
// the clone out of layout so it can't shift the page or trigger any
// of the target's side-effects. Returns null on any failure (detached
// element, exotic namespace, etc.) so callers fall back to the
// hardcoded heuristic below.
export const measureBaseline = (target: Element): ComputedSnapshot | null => {
  try {
    const parent = target.parentElement;
    if (!parent) return null;
    const namespaceUri = target.namespaceURI;
    const tag = target.tagName.toLowerCase();
    const baseline =
      namespaceUri && namespaceUri !== "http://www.w3.org/1999/xhtml"
        ? target.ownerDocument.createElementNS(namespaceUri, tag)
        : target.ownerDocument.createElement(tag);
    (baseline as HTMLElement).style?.setProperty("display", "none", "important");
    parent.appendChild(baseline);
    try {
      return snapshotAllKeys(getComputedStyle(baseline));
    } finally {
      baseline.remove();
    }
  } catch {
    return null;
  }
};

export const matchesBaseline = (
  cssProperties: readonly string[],
  currentSnapshot: ComputedSnapshot,
  baselineSnapshot: ComputedSnapshot,
): boolean => {
  return cssProperties.every((key) => {
    const currentValue = currentSnapshot[key];
    const baselineValue = baselineSnapshot[key];
    if (currentValue === undefined || baselineValue === undefined) return false;
    return currentValue === baselineValue;
  });
};

// Legacy heuristic used only when measureBaseline returns null (target
// has no parent, is in an exotic shadow tree, etc.). Kept as a safety
// net so the panel still produces a sensible list even without a
// baseline.
export const isDefaultByHeuristic = (property: EditableProperty): boolean => {
  if (property.kind === "color") return false;
  if (property.kind === "enum") {
    if (property.key === "font-weight") return property.original === "400";
    return property.options[0]?.value === property.original;
  }
  const { key, original: value } = property;
  if (key.startsWith("padding") || key.startsWith("margin")) return value === 0;
  if (key.includes("gap")) return value === 0;
  if (key === "border-width") return value === 0;
  if (key.endsWith("-radius") || key === "border-radius") return value === 0;
  if (key === "opacity") return value === OPACITY_PERCENT_MAX;
  if (key === "letter-spacing") return value === 0;
  if (key === "z-index") return value === 0;
  if (POSITION_KEYS.has(key)) return false;
  if (key === "width" || key === "height" || key.startsWith("max-") || key.startsWith("min-")) {
    return true;
  }
  if (key === "line-height") return true;
  return false;
};

// Picks each longhand's "canonical aggregate" as the largest one that
// covers it at the same value. Padding with 4 uniform sides → "padding"
// is canonical; y/x aligned but not all four → "padding-y" + "padding-x";
// nothing aligned → 4 individual sides. Same algorithm works for margin
// and border-radius regardless of their longhand topology.
export const tagAggregateGroup = (
  snapshot: StyleSnapshot,
  definitions: readonly AggregateDefinition[],
): Array<{ definition: AggregateDefinition; value: NumericValue; isCanonical: boolean }> => {
  const resolvedAggregates = definitions
    .map((definition) => {
      const value =
        definition.longhands.length === 1
          ? valueWithFallback(snapshot, definition.longhands[0])
          : alignedValue(snapshot, definition.longhands);
      return value ? { definition, value } : null;
    })
    .filter(<T>(entry: T | null): entry is T => entry !== null);

  const canonicalForLonghand = new Map<TrackedProperty, (typeof resolvedAggregates)[number]>();
  for (const entry of resolvedAggregates) {
    for (const longhand of entry.definition.longhands) {
      const current = canonicalForLonghand.get(longhand);
      if (!current || entry.definition.longhands.length > current.definition.longhands.length) {
        canonicalForLonghand.set(longhand, entry);
      }
    }
  }
  const canonicalSet = new Set(canonicalForLonghand.values());
  return resolvedAggregates.map((entry) => ({ ...entry, isCanonical: canonicalSet.has(entry) }));
};

export const buildNumericProperty = (
  definition: AggregateDefinition,
  raw: NumericValue,
  isCanonical: boolean,
): NumericEditableProperty => {
  const normalized = normalizeForEdit(definition.key, raw);
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

export const buildColorProperty = (
  cssKey: string,
  label: string,
  rawCssValue: string,
): ColorEditableProperty | null => {
  const hex = rgbStringToHex(rawCssValue);
  if (!hex) return null;
  return {
    kind: "color",
    key: cssKey,
    label,
    cssProperties: [cssKey],
    value: hex,
    original: hex,
    tailwindAliases: tailwindAliasesForProperty(cssKey),
    isPrioritized: false,
    isDefault: false,
    isCanonical: true,
  };
};

export const buildEnumProperty = (
  definition: { key: string; label: string; options?: ReadonlyArray<EnumEditableOption> },
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
