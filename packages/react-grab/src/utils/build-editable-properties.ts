import {
  EDIT_PROPERTY_MAX_COUNT,
  FONT_SIZE_LINE_HEIGHT_RATIO,
  OPACITY_PERCENT_MAX,
} from "../constants.js";
import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableOption,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../types.js";
import { cleanNumericValue } from "./format-css-value.js";
import { isTransparentRgbString, rgbStringToHex } from "./parse-color.js";
import { parseNumericValue, type NumericValue } from "./parse-numeric-value.js";
import { getElementTailwindProperties, tailwindAliasesForProperty } from "./tailwind-class-map.js";

const TRACKED_PROPERTIES = [
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  "row-gap",
  "column-gap",
  "font-size",
  "line-height",
  "letter-spacing",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "border-width",
  "opacity",
  "width",
  "height",
  "max-width",
  "max-height",
] as const;

type TrackedProperty = (typeof TRACKED_PROPERTIES)[number];
type StyleSnapshot = Record<TrackedProperty, string>;

const ALIGNED_VALUE_TOLERANCE_PX = 0.5;
const LETTER_SPACING_MIN_PX = -10;
const LETTER_SPACING_MAX_PX = 20;
const FONT_SIZE_MIN_PX = 8;
const FONT_SIZE_MAX_PX = 96;
const LINE_HEIGHT_MIN_PX = 0;
const LINE_HEIGHT_MAX_PX = 120;
const RADIUS_MIN_PX = 0;
const RADIUS_MAX_PX = 96;
const SIZE_FALLBACK_MAX_PX = 512;
const SIZE_FALLBACK_MULTIPLIER = 2;
const SPACING_MIN_PX = 0;
const SPACING_MAX_PX = 128;
const MARGIN_MIN_PX = -128;
const PERCENT_RANGE_MIN = 0;
const PERCENT_RANGE_MAX = 100;
const OPACITY_MIN_PERCENT = 0;

const snapshotElement = (element: Element): StyleSnapshot => {
  const computed = getComputedStyle(element);
  const snapshot = {} as StyleSnapshot;
  for (const property of TRACKED_PROPERTIES) {
    snapshot[property] = computed.getPropertyValue(property);
  }
  return snapshot;
};

const alignedValue = (
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

const FALLBACK_ZERO_PX: ReadonlySet<TrackedProperty> = new Set([
  "letter-spacing",
  "gap",
  "row-gap",
  "column-gap",
]);

const valueWithFallback = (
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

const propertyBounds = (key: string, value: number, unit: string): { min: number; max: number } => {
  if (key === "opacity") return { min: OPACITY_MIN_PERCENT, max: OPACITY_PERCENT_MAX };
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
  if (unit === "%") return { min: PERCENT_RANGE_MIN, max: PERCENT_RANGE_MAX };
  return {
    min: key.startsWith("margin") ? MARGIN_MIN_PX : SPACING_MIN_PX,
    max: SPACING_MAX_PX,
  };
};

const normalizeForEdit = (key: string, value: NumericValue): NumericValue => {
  if (key === "opacity") {
    return { value: Math.round(value.value * OPACITY_PERCENT_MAX), unit: "%" };
  }
  return { value: cleanNumericValue(value.value), unit: value.unit || "px" };
};

interface AggregateDefinition {
  key: string;
  label: string;
  longhands: readonly TrackedProperty[];
}

const PADDING_AGGREGATES: readonly AggregateDefinition[] = [
  {
    key: "padding",
    label: "padding",
    longhands: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  },
  {
    key: "padding-top,padding-bottom",
    label: "padding-y",
    longhands: ["padding-top", "padding-bottom"],
  },
  {
    key: "padding-left,padding-right",
    label: "padding-x",
    longhands: ["padding-left", "padding-right"],
  },
  { key: "padding-top", label: "padding top", longhands: ["padding-top"] },
  { key: "padding-right", label: "padding right", longhands: ["padding-right"] },
  { key: "padding-bottom", label: "padding bottom", longhands: ["padding-bottom"] },
  { key: "padding-left", label: "padding left", longhands: ["padding-left"] },
];

const MARGIN_AGGREGATES: readonly AggregateDefinition[] = [
  {
    key: "margin",
    label: "margin",
    longhands: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  },
  {
    key: "margin-top,margin-bottom",
    label: "margin-y",
    longhands: ["margin-top", "margin-bottom"],
  },
  {
    key: "margin-left,margin-right",
    label: "margin-x",
    longhands: ["margin-left", "margin-right"],
  },
  { key: "margin-top", label: "margin top", longhands: ["margin-top"] },
  { key: "margin-right", label: "margin right", longhands: ["margin-right"] },
  { key: "margin-bottom", label: "margin bottom", longhands: ["margin-bottom"] },
  { key: "margin-left", label: "margin left", longhands: ["margin-left"] },
];

// gap shorthand has no CSS longhand; setting `gap` is just setting both
// row-gap and column-gap. Treating it as an aggregate over its two
// real longhands lets the canonical-row algorithm pick "gap" when
// aligned and split into "row gap" + "column gap" otherwise — same
// behavior we used to roll by hand.
const GAP_AGGREGATES: readonly AggregateDefinition[] = [
  { key: "gap", label: "gap", longhands: ["row-gap", "column-gap"] },
  { key: "row-gap", label: "row gap", longhands: ["row-gap"] },
  { key: "column-gap", label: "column gap", longhands: ["column-gap"] },
];

const RADIUS_AGGREGATES: readonly AggregateDefinition[] = [
  {
    key: "border-radius",
    label: "border radius",
    longhands: [
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-right-radius",
      "border-bottom-left-radius",
    ],
  },
  {
    key: "border-top-left-radius,border-top-right-radius",
    label: "top corners",
    longhands: ["border-top-left-radius", "border-top-right-radius"],
  },
  {
    key: "border-bottom-left-radius,border-bottom-right-radius",
    label: "bottom corners",
    longhands: ["border-bottom-left-radius", "border-bottom-right-radius"],
  },
  {
    key: "border-top-left-radius,border-bottom-left-radius",
    label: "left corners",
    longhands: ["border-top-left-radius", "border-bottom-left-radius"],
  },
  {
    key: "border-top-right-radius,border-bottom-right-radius",
    label: "right corners",
    longhands: ["border-top-right-radius", "border-bottom-right-radius"],
  },
  {
    key: "border-top-left-radius",
    label: "top left radius",
    longhands: ["border-top-left-radius"],
  },
  {
    key: "border-top-right-radius",
    label: "top right radius",
    longhands: ["border-top-right-radius"],
  },
  {
    key: "border-bottom-right-radius",
    label: "bottom right radius",
    longhands: ["border-bottom-right-radius"],
  },
  {
    key: "border-bottom-left-radius",
    label: "bottom left radius",
    longhands: ["border-bottom-left-radius"],
  },
];

// Non-aggregate rows (each row maps 1:1 to a single CSS longhand). The
// canonical flag is always true for singles because there's no broader
// row that could subsume them.
const SINGLE_PROPERTIES: readonly { key: TrackedProperty; label: string }[] = [
  { key: "font-size", label: "font size" },
  { key: "line-height", label: "line height" },
  { key: "letter-spacing", label: "letter spacing" },
  { key: "border-width", label: "border width" },
  { key: "width", label: "width" },
  { key: "height", label: "height" },
  { key: "max-width", label: "max width" },
  { key: "max-height", label: "max height" },
  { key: "opacity", label: "opacity" },
];

const buildNumericProperty = (
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
    prioritized: false,
    isDefault: false,
    isCanonical,
  };
};

// Color properties (color, background-color, border-color, fill, stroke)
// pulled from computed style and rendered via the color-picker control
// instead of the slider. We deliberately limit the list to the handful
// users actually want to tweak — every element computes dozens of
// colour-typed properties, most of them inherited and uninteresting.
const COLOR_PROPERTIES: ReadonlyArray<{ key: string; label: string }> = [
  { key: "color", label: "text color" },
  { key: "background-color", label: "background" },
  { key: "border-color", label: "border color" },
  { key: "fill", label: "fill" },
  { key: "stroke", label: "stroke" },
];

const buildColorProperty = (
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
    prioritized: false,
    isDefault: false,
    isCanonical: true,
  };
};

// Enum properties — CSS keys whose value is one of a fixed small set
// (segmented control). Each entry lists the canonical labels we want to
// show (in display order). Properties only surface if the computed
// value matches one of the options, so we don't render a misleading
// active state when the page uses an unsupported value.
const ENUM_PROPERTIES: ReadonlyArray<{
  key: string;
  label: string;
  options: ReadonlyArray<EnumEditableOption>;
}> = [
  {
    key: "display",
    label: "display",
    options: [
      { value: "block", label: "block" },
      { value: "flex", label: "flex" },
      { value: "inline-block", label: "inline-block" },
      { value: "inline", label: "inline" },
      { value: "grid", label: "grid" },
      { value: "none", label: "none" },
    ],
  },
  {
    key: "text-align",
    label: "text align",
    options: [
      { value: "left", label: "left" },
      { value: "center", label: "center" },
      { value: "right", label: "right" },
      { value: "justify", label: "justify" },
    ],
  },
  {
    key: "font-style",
    label: "font style",
    options: [
      { value: "normal", label: "normal" },
      { value: "italic", label: "italic" },
    ],
  },
  {
    key: "text-decoration-line",
    label: "decoration",
    options: [
      { value: "none", label: "none" },
      { value: "underline", label: "underline" },
      { value: "line-through", label: "strike" },
    ],
  },
  {
    key: "border-style",
    label: "border style",
    options: [
      { value: "none", label: "none" },
      { value: "solid", label: "solid" },
      { value: "dashed", label: "dashed" },
      { value: "dotted", label: "dotted" },
    ],
  },
  {
    key: "visibility",
    label: "visibility",
    options: [
      { value: "visible", label: "visible" },
      { value: "hidden", label: "hidden" },
    ],
  },
];

const buildEnumProperty = (
  definition: (typeof ENUM_PROPERTIES)[number],
  rawCssValue: string,
): EnumEditableProperty | null => {
  const trimmed = rawCssValue.trim();
  if (!definition.options.some((option) => option.value === trimmed)) return null;
  return {
    kind: "enum",
    key: definition.key,
    label: definition.label,
    cssProperties: [definition.key],
    value: trimmed,
    original: trimmed,
    options: definition.options,
    tailwindAliases: tailwindAliasesForProperty(definition.key),
    prioritized: false,
    isDefault: false,
    isCanonical: true,
  };
};

// Picks each longhand's "canonical aggregate" as the largest one that
// covers it at the same value. Padding with 4 uniform sides → "padding"
// is canonical; y/x aligned but not all four → "padding-y" + "padding-x";
// nothing aligned → 4 individual sides. Same algorithm works for margin
// and border-radius regardless of their longhand topology.
const tagAggregateGroup = (
  snapshot: StyleSnapshot,
  definitions: readonly AggregateDefinition[],
): Array<{ definition: AggregateDefinition; value: NumericValue; isCanonical: boolean }> => {
  const resolved = definitions
    .map((definition) => {
      const value =
        definition.longhands.length === 1
          ? valueWithFallback(snapshot, definition.longhands[0])
          : alignedValue(snapshot, definition.longhands);
      return value ? { definition, value } : null;
    })
    .filter(<T>(entry: T | null): entry is T => entry !== null);

  const canonicalForLonghand = new Map<TrackedProperty, (typeof resolved)[number]>();
  for (const entry of resolved) {
    for (const longhand of entry.definition.longhands) {
      const current = canonicalForLonghand.get(longhand);
      if (!current || entry.definition.longhands.length > current.definition.longhands.length) {
        canonicalForLonghand.set(longhand, entry);
      }
    }
  }
  const canonicalSet = new Set(canonicalForLonghand.values());
  return resolved.map((entry) => ({ ...entry, isCanonical: canonicalSet.has(entry) }));
};

const isDefaultPropertyValue = (property: EditableProperty): boolean => {
  // Color properties: leave default-detection to the build step that
  // already drops fully-transparent backgrounds; anything that survives
  // is a real value worth surfacing.
  if (property.kind === "color") return false;
  // Enum properties: hide rows whose computed value matches the
  // first declared option, which we author as the browser default
  // (block, left, normal, none, none, visible). Keeping the default
  // as options[0] is enforced by convention in ENUM_PROPERTIES rather
  // than a parallel lookup table.
  if (property.kind === "enum") {
    return property.options[0]?.value === property.original;
  }
  const { key, original: value } = property;
  if (key.startsWith("padding") || key.startsWith("margin")) return value === 0;
  if (key.includes("gap")) return value === 0;
  if (key === "border-width") return value === 0;
  if (key.endsWith("-radius") || key === "border-radius") return value === 0;
  if (key === "opacity") return value === OPACITY_PERCENT_MAX;
  if (key === "letter-spacing") return value === 0;
  // width/height/max-*/line-height are always computed by the layout
  // engine; hide them unless the user explicitly opts in via a Tailwind
  // class or search query.
  if (key === "width" || key === "height" || key.startsWith("max-") || key.startsWith("min-")) {
    return true;
  }
  if (key === "line-height") return true;
  return false;
};

const AGGREGATE_GROUPS: readonly (readonly AggregateDefinition[])[] = [
  PADDING_AGGREGATES,
  MARGIN_AGGREGATES,
  GAP_AGGREGATES,
  RADIUS_AGGREGATES,
];

export const buildEditableProperties = (element: Element): EditableProperty[] => {
  const snapshot = snapshotElement(element);
  const properties: EditableProperty[] = [];
  const seen = new Set<string>();

  const push = (property: EditableProperty) => {
    if (seen.has(property.key) || properties.length >= EDIT_PROPERTY_MAX_COUNT) return;
    properties.push(property);
    seen.add(property.key);
  };

  for (const group of AGGREGATE_GROUPS) {
    for (const entry of tagAggregateGroup(snapshot, group)) {
      push(buildNumericProperty(entry.definition, entry.value, entry.isCanonical));
    }
  }

  for (const single of SINGLE_PROPERTIES) {
    const value = valueWithFallback(snapshot, single.key);
    if (!value) continue;
    push(
      buildNumericProperty(
        { key: single.key, label: single.label, longhands: [single.key] },
        value,
        true,
      ),
    );
  }

  const computed = getComputedStyle(element);
  for (const { key, label } of COLOR_PROPERTIES) {
    const raw = computed.getPropertyValue(key);
    if (!raw || isTransparentRgbString(raw)) continue;
    const colorProperty = buildColorProperty(key, label, raw);
    if (colorProperty) push(colorProperty);
  }

  for (const definition of ENUM_PROPERTIES) {
    const raw = computed.getPropertyValue(definition.key);
    if (!raw) continue;
    const enumProperty = buildEnumProperty(definition, raw);
    if (enumProperty) push(enumProperty);
  }

  return finalizeProperties(properties, getElementTailwindProperties(element));
};

const finalizeProperties = (
  properties: EditableProperty[],
  prioritized: Set<string>,
): EditableProperty[] => {
  const tier1: EditableProperty[] = [];
  const tier2: EditableProperty[] = [];

  for (const property of properties) {
    if (prioritized.has(property.key)) {
      tier1.push({ ...property, prioritized: true, isDefault: false });
    } else {
      tier2.push({ ...property, isDefault: isDefaultPropertyValue(property) });
    }
  }
  return [...tier1, ...tier2];
};
