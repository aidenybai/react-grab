import { TAILWIND_SPACING_MAX_UNITS, TAILWIND_SPACING_UNIT_PX } from "../constants.js";
import type { EnumEditableOption } from "../types.js";

export const TRACKED_PROPERTIES = [
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
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "opacity",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
] as const;

export type TrackedProperty = (typeof TRACKED_PROPERTIES)[number];
export type StyleSnapshot = Record<TrackedProperty, string>;

export const ALIGNED_VALUE_TOLERANCE_PX = 0.5;
export const LETTER_SPACING_MIN_PX = -10;
export const LETTER_SPACING_MAX_PX = 20;
export const FONT_SIZE_MIN_PX = 8;
export const FONT_SIZE_MAX_PX = 96;
export const LINE_HEIGHT_MIN_PX = 0;
export const LINE_HEIGHT_MAX_PX = 120;
export const RADIUS_MIN_PX = 0;
export const RADIUS_MAX_PX = 96;
export const SIZE_FALLBACK_MAX_PX = 512;
export const SIZE_FALLBACK_MULTIPLIER = 2;
export const SPACING_MIN_PX = 0;
export const SPACING_MAX_PX = TAILWIND_SPACING_MAX_UNITS * TAILWIND_SPACING_UNIT_PX;
export const MARGIN_MIN_PX = -128;
export const POSITION_MIN_PX = -512;
export const POSITION_MAX_PX = 512;
export const Z_INDEX_MIN = -9999;
export const Z_INDEX_MAX = 9999;
export const PERCENT_RANGE_MIN = 0;
export const PERCENT_RANGE_MAX = 100;
export const OPACITY_MIN_PERCENT = 0;

export const FALLBACK_ZERO_PX: ReadonlySet<TrackedProperty> = new Set([
  "letter-spacing",
  "gap",
  "row-gap",
  "column-gap",
]);

export const POSITION_KEYS: ReadonlySet<string> = new Set([
  "top",
  "right",
  "bottom",
  "left",
  "top,right,bottom,left",
  "top,bottom",
  "left,right",
]);

// Keys whose CSS value is a pure number (no unit). Writing `10px` here
// would be invalid CSS.
export const UNITLESS_KEYS: ReadonlySet<string> = new Set(["z-index"]);

export interface AggregateDefinition {
  key: string;
  label: string;
  longhands: readonly TrackedProperty[];
}

// Aggregate `key` strings are referenced verbatim by the rank map in
// utils/sort-properties-by-recommendation.ts — reordering comma-joined
// longhands here means updating the rank map too, or rows will sink
// to the bottom of the recommended tier.
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

const BORDER_WIDTH_AGGREGATES: readonly AggregateDefinition[] = [
  {
    key: "border-width",
    label: "border width",
    longhands: [
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
    ],
  },
  { key: "border-top-width", label: "border top width", longhands: ["border-top-width"] },
  { key: "border-right-width", label: "border right width", longhands: ["border-right-width"] },
  { key: "border-bottom-width", label: "border bottom width", longhands: ["border-bottom-width"] },
  { key: "border-left-width", label: "border left width", longhands: ["border-left-width"] },
];

export const AGGREGATE_GROUPS: readonly (readonly AggregateDefinition[])[] = [
  PADDING_AGGREGATES,
  MARGIN_AGGREGATES,
  GAP_AGGREGATES,
  RADIUS_AGGREGATES,
  BORDER_WIDTH_AGGREGATES,
  INSET_AGGREGATES,
];

export const SINGLE_PROPERTIES: readonly { key: TrackedProperty; label: string }[] = [
  { key: "font-size", label: "font size" },
  { key: "line-height", label: "line height" },
  { key: "letter-spacing", label: "letter spacing" },
  { key: "width", label: "width" },
  { key: "height", label: "height" },
  { key: "min-width", label: "min width" },
  { key: "min-height", label: "min height" },
  { key: "max-width", label: "max width" },
  { key: "max-height", label: "max height" },
  { key: "z-index", label: "z-index" },
  { key: "opacity", label: "opacity" },
];

// Color properties (color, background-color, border-color, fill, stroke)
// pulled from computed style and rendered via the color-picker control
// instead of the slider. We deliberately limit the list to the handful
// users actually want to tweak — every element computes dozens of
// colour-typed properties, most of them inherited and uninteresting.
// `alwaysShow` colors (text color, background) surface as pinned rows
// even when the element has no value set yet, so users can always pick
// one. The rest only appear when the element actually paints them.
export const COLOR_PROPERTIES: ReadonlyArray<{
  key: string;
  label: string;
  alwaysShow?: boolean;
}> = [
  { key: "color", label: "text color", alwaysShow: true },
  { key: "background-color", label: "background", alwaysShow: true },
  { key: "border-color", label: "border color" },
  { key: "fill", label: "fill" },
  { key: "stroke", label: "stroke" },
];

// Enum properties — CSS keys whose value is one of a fixed small set
// (segmented control). Each entry lists the canonical labels we want to
// show (in display order). Properties only surface if the computed
// value matches one of the options, so we don't render a misleading
// active state when the page uses an unsupported value.
export interface EnumPropertyDefinition {
  key: string;
  label: string;
  options?: ReadonlyArray<EnumEditableOption>;
}

const FONT_FAMILY_OPTIONS: ReadonlyArray<EnumEditableOption> = [
  {
    value:
      'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    label: "sans",
  },
  {
    value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    label: "serif",
  },
  {
    value:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    label: "mono",
  },
  { value: "system-ui, sans-serif", label: "system" },
  { value: "serif", label: "serif" },
  { value: "monospace", label: "mono" },
];

export const resolveFontFamilyOptions = (
  rawCssValue: string,
): ReadonlyArray<EnumEditableOption> => {
  const trimmed = rawCssValue.trim();
  return FONT_FAMILY_OPTIONS.some((option) => option.value === trimmed)
    ? FONT_FAMILY_OPTIONS
    : [{ value: trimmed, label: "current" }, ...FONT_FAMILY_OPTIONS];
};

export const FONT_FAMILY_DEFINITION = {
  key: "font-family",
  label: "font family",
} as const;

export const ENUM_PROPERTIES: ReadonlyArray<EnumPropertyDefinition> = [
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
    key: "text-transform",
    label: "text transform",
    options: [
      { value: "none", label: "none" },
      { value: "uppercase", label: "uppercase" },
      { value: "lowercase", label: "lowercase" },
      { value: "capitalize", label: "capitalize" },
    ],
  },
  {
    key: "white-space",
    label: "white space",
    options: [
      { value: "normal", label: "normal" },
      { value: "nowrap", label: "nowrap" },
      { value: "pre", label: "pre" },
      { value: "pre-wrap", label: "pre-wrap" },
      { value: "pre-line", label: "pre-line" },
      { value: "break-spaces", label: "break-spaces" },
    ],
  },
  {
    key: "word-break",
    label: "word break",
    options: [
      { value: "normal", label: "normal" },
      { value: "break-all", label: "break-all" },
      { value: "keep-all", label: "keep-all" },
    ],
  },
  {
    key: "overflow-wrap",
    label: "wrap",
    options: [
      { value: "normal", label: "normal" },
      { value: "break-word", label: "break-word" },
      { value: "anywhere", label: "anywhere" },
    ],
  },
  {
    key: "font-variant-numeric",
    label: "number style",
    options: [
      { value: "normal", label: "normal" },
      { value: "tabular-nums", label: "tabular" },
      { value: "proportional-nums", label: "proportional" },
      { value: "lining-nums", label: "lining" },
      { value: "oldstyle-nums", label: "oldstyle" },
      { value: "slashed-zero", label: "slashed zero" },
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

// All keys we read from computed style across the three kinds.
// Used to snapshot both the target AND the diff baseline so a single
// per-key string compare resolves "did the user (or a class on this
// element) override this property from the baseline?".
export const ALL_BASELINE_KEYS: ReadonlyArray<string> = [
  ...TRACKED_PROPERTIES,
  "color",
  "background-color",
  "border-color",
  "fill",
  "stroke",
  "font-family",
  "display",
  "text-align",
  "font-style",
  "text-transform",
  "white-space",
  "word-break",
  "overflow-wrap",
  "font-variant-numeric",
  "text-decoration-line",
  "border-style",
  "visibility",
  "align-items",
  "justify-content",
  "font-weight",
];
