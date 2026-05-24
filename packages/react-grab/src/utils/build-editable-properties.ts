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
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
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
const POSITION_MIN_PX = -512;
const POSITION_MAX_PX = 512;
const Z_INDEX_MIN = -9999;
const Z_INDEX_MAX = 9999;
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

const POSITION_KEYS: ReadonlySet<string> = new Set([
  "top",
  "right",
  "bottom",
  "left",
  "top,right,bottom,left",
  "top,bottom",
  "left,right",
]);

const propertyBounds = (key: string, value: number, unit: string): { min: number; max: number } => {
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

// Keys whose CSS value is a pure number (no unit). Writing `10px` here
// would be invalid CSS.
const UNITLESS_KEYS: ReadonlySet<string> = new Set(["z-index"]);

const normalizeForEdit = (key: string, value: NumericValue): NumericValue => {
  if (key === "opacity") {
    return { value: Math.round(value.value * OPACITY_PERCENT_MAX), unit: "%" };
  }
  if (UNITLESS_KEYS.has(key)) {
    return { value: cleanNumericValue(value.value), unit: "" };
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

const INSET_AGGREGATES: readonly AggregateDefinition[] = [
  {
    key: "top,right,bottom,left",
    label: "inset",
    longhands: ["top", "right", "bottom", "left"],
  },
  { key: "top,bottom", label: "inset-y", longhands: ["top", "bottom"] },
  { key: "left,right", label: "inset-x", longhands: ["left", "right"] },
  { key: "top", label: "top", longhands: ["top"] },
  { key: "right", label: "right", longhands: ["right"] },
  { key: "bottom", label: "bottom", longhands: ["bottom"] },
  { key: "left", label: "left", longhands: ["left"] },
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
  { key: "z-index", label: "z-index" },
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
  {
    key: "align-items",
    label: "align items",
    options: [
      { value: "stretch", label: "stretch" },
      { value: "flex-start", label: "start" },
      { value: "center", label: "center" },
      { value: "flex-end", label: "end" },
      { value: "baseline", label: "baseline" },
    ],
  },
  {
    key: "justify-content",
    label: "justify content",
    options: [
      { value: "flex-start", label: "start" },
      { value: "center", label: "center" },
      { value: "flex-end", label: "end" },
      { value: "space-between", label: "between" },
      { value: "space-around", label: "around" },
      { value: "space-evenly", label: "evenly" },
    ],
  },
  {
    key: "font-weight",
    label: "font weight",
    // Computed style always returns the numeric form, so options use
    // numeric `value` (matches the snapshot) with descriptive labels.
    // Tailwind utilities like `font-bold` aren't mapped 1:1 to a class
    // here (named-scale resolution is Tier 3 future work) — for now the
    // user picks via the cycle control or types a numeric class.
    options: [
      { value: "100", label: "thin" },
      { value: "200", label: "extra-light" },
      { value: "300", label: "light" },
      { value: "400", label: "normal" },
      { value: "500", label: "medium" },
      { value: "600", label: "semibold" },
      { value: "700", label: "bold" },
      { value: "800", label: "extra-bold" },
      { value: "900", label: "black" },
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

type ComputedSnapshot = Record<string, string>;

// All keys we read from computed style across the three kinds.
// Used to snapshot both the target AND the diff baseline so a single
// per-key string compare resolves "did the user (or a class on this
// element) override this property from the baseline?".
const ALL_BASELINE_KEYS: ReadonlyArray<string> = [
  ...TRACKED_PROPERTIES,
  "color",
  "background-color",
  "border-color",
  "fill",
  "stroke",
  "display",
  "text-align",
  "font-style",
  "text-decoration-line",
  "border-style",
  "visibility",
  "align-items",
  "justify-content",
  "font-weight",
];

const snapshotAllKeys = (computed: CSSStyleDeclaration): ComputedSnapshot => {
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
const measureBaseline = (target: Element): ComputedSnapshot | null => {
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

// Diff-based default detection: a property is "default" if every CSS
// longhand it covers matches the baseline. Replaces the per-property
// heuristics for elements where the baseline can be measured.
const matchesBaseline = (
  cssProperties: readonly string[],
  current: ComputedSnapshot,
  baseline: ComputedSnapshot,
): boolean => {
  return cssProperties.every((key) => {
    const cur = current[key];
    const base = baseline[key];
    if (cur === undefined || base === undefined) return false;
    return cur === base;
  });
};

// Properties we always surface in the default view regardless of
// baseline-diff. The baseline-only filter is too aggressive — it hides
// `padding: 0` because the baseline button also has `padding: 0`,
// even though tweaking padding from 0 is one of the most common
// design moves. Match a small whitelist by CSS longhand so individual
// sides (padding-top) AND aggregates (padding, padding-y) both qualify.
const isCoreProperty = (property: EditableProperty): boolean => {
  if (property.kind === "color") {
    return property.key === "color" || property.key === "background-color";
  }
  if (property.kind !== "numeric") return false;
  return property.cssProperties.some((cssProperty) => {
    if (cssProperty.startsWith("padding")) return true;
    if (cssProperty.startsWith("margin")) return true;
    if (cssProperty === "font-size") return true;
    if (cssProperty.includes("radius")) return true;
    if (cssProperty === "opacity") return true;
    return false;
  });
};

// Legacy heuristic used only when measureBaseline returns null (target
// has no parent, is in an exotic shadow tree, etc.). Kept as a safety
// net so the panel still produces a sensible list even without a
// baseline.
const isDefaultByHeuristic = (property: EditableProperty): boolean => {
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

const AGGREGATE_GROUPS: readonly (readonly AggregateDefinition[])[] = [
  PADDING_AGGREGATES,
  MARGIN_AGGREGATES,
  GAP_AGGREGATES,
  RADIUS_AGGREGATES,
  INSET_AGGREGATES,
];

export const buildEditableProperties = (element: Element): EditableProperty[] => {
  const snapshot = snapshotElement(element);
  const computed = getComputedStyle(element);
  const currentAllKeys = snapshotAllKeys(computed);
  const baseline = measureBaseline(element);
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

  return finalizeProperties(
    properties,
    getElementTailwindProperties(element),
    currentAllKeys,
    baseline,
  );
};

const finalizeProperties = (
  properties: EditableProperty[],
  prioritized: Set<string>,
  current: ComputedSnapshot,
  baseline: ComputedSnapshot | null,
): EditableProperty[] => {
  const tier1: EditableProperty[] = [];
  const tier2: EditableProperty[] = [];

  for (const property of properties) {
    if (prioritized.has(property.key)) {
      tier1.push({ ...property, prioritized: true, isDefault: false });
    } else if (isCoreProperty(property)) {
      // Core properties skip default-detection: they're always
      // surfaced in the default view since users frequently want to
      // tweak them from zero.
      tier2.push({ ...property, isDefault: false });
    } else {
      const isDefault = baseline
        ? matchesBaseline(property.cssProperties, current, baseline)
        : isDefaultByHeuristic(property);
      tier2.push({ ...property, isDefault });
    }
  }
  return [...tier1, ...tier2];
};
