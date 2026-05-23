import { EDIT_PROPERTY_MAX_COUNT } from "../constants.js";
import type { EditableProperty } from "../types.js";
import { parseNumericValue, type NumericValue } from "./parse-numeric-value.js";
import {
  getElementTailwindProperties,
  tailwindAliasesForProperty,
} from "./tailwind-class-map.js";

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

const FONT_SIZE_LINE_HEIGHT_RATIO = 1.2;
const ROUND_TWO_DECIMALS = 100;
const ALIGNED_VALUE_TOLERANCE_PX = 0.5;
const OPACITY_MIN_PERCENT = 0;
const OPACITY_MAX_PERCENT = 100;
const PERCENT_RANGE_MIN = 0;
const PERCENT_RANGE_MAX = 100;
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
  properties: TrackedProperty[],
): NumericValue | null => {
  const first = parseNumericValue(snapshot[properties[0]]);
  if (!first) return null;
  for (let index = 1; index < properties.length; index++) {
    const next = parseNumericValue(snapshot[properties[index]]);
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
      value:
        Math.round(fontSize.value * FONT_SIZE_LINE_HEIGHT_RATIO * ROUND_TWO_DECIMALS) /
        ROUND_TWO_DECIMALS,
      unit: fontSize.unit || "px",
    };
  }

  if (
    property === "letter-spacing" ||
    property === "gap" ||
    property === "row-gap" ||
    property === "column-gap"
  ) {
    return { value: 0, unit: "px" };
  }

  return null;
};

const propertyBounds = (
  property: string,
  value: number,
  unit: string,
): { min: number; max: number } => {
  if (property === "opacity") return { min: OPACITY_MIN_PERCENT, max: OPACITY_MAX_PERCENT };
  if (property === "letter-spacing") {
    return { min: LETTER_SPACING_MIN_PX, max: LETTER_SPACING_MAX_PX };
  }
  if (property === "font-size") return { min: FONT_SIZE_MIN_PX, max: FONT_SIZE_MAX_PX };
  if (property === "line-height") return { min: LINE_HEIGHT_MIN_PX, max: LINE_HEIGHT_MAX_PX };
  if (property.includes("radius")) return { min: RADIUS_MIN_PX, max: RADIUS_MAX_PX };
  if (property === "width" || property === "height" || property.startsWith("max-")) {
    return {
      min: 0,
      max: Math.max(SIZE_FALLBACK_MAX_PX, Math.ceil(value * SIZE_FALLBACK_MULTIPLIER)),
    };
  }
  if (unit === "%") return { min: PERCENT_RANGE_MIN, max: PERCENT_RANGE_MAX };
  return {
    min: property.startsWith("margin") ? MARGIN_MIN_PX : SPACING_MIN_PX,
    max: SPACING_MAX_PX,
  };
};

const normalizeForEdit = (property: string, value: NumericValue): NumericValue => {
  if (property === "opacity") {
    return { value: Math.round(value.value * OPACITY_MAX_PERCENT), unit: "%" };
  }
  return {
    value: Math.round(value.value * ROUND_TWO_DECIMALS) / ROUND_TWO_DECIMALS,
    unit: value.unit || "px",
  };
};

const buildNumericProperty = (
  property: string,
  label: string,
  raw: NumericValue,
): EditableProperty => {
  const normalized = normalizeForEdit(property, raw);
  const bounds = propertyBounds(property, normalized.value, normalized.unit);
  return {
    label,
    property,
    min: bounds.min,
    max: bounds.max,
    value: normalized.value,
    original: normalized.value,
    unit: normalized.unit,
    tailwindAliases: tailwindAliasesForProperty(property),
  };
};

export const buildEditableProperties = (element: Element): EditableProperty[] => {
  const snapshot = snapshotElement(element);
  const properties: EditableProperty[] = [];
  const seen = new Set<string>();

  const pushNumeric = (
    property: string,
    label: string,
    value: NumericValue | null,
    isCanonical: boolean,
  ) => {
    if (!value || seen.has(property) || properties.length >= EDIT_PROPERTY_MAX_COUNT) return;
    properties.push({ ...buildNumericProperty(property, label, value), isCanonical });
    seen.add(property);
  };

  // Emit every variant (group / y / x / individual sides) that has a value,
  // tagging canonical = the highest-level form that captures the current
  // snapshot. The panel shows only canonical entries by default but searches
  // across all of them, so Tailwind aliases like `pl` can still rank to
  // `padding-left` even when all four sides are uniform.
  const pushBoxGroup = (
    label: string,
    property: string,
    allProperties: TrackedProperty[],
    blockProperties: [TrackedProperty, TrackedProperty],
    inlineProperties: [TrackedProperty, TrackedProperty],
  ) => {
    const all = alignedValue(snapshot, allProperties);
    const block = alignedValue(snapshot, blockProperties);
    const inline = alignedValue(snapshot, inlineProperties);

    pushNumeric(property, label, all, Boolean(all));
    pushNumeric(`${property}-top,${property}-bottom`, `${label}-y`, block, !all && Boolean(block));
    pushNumeric(
      `${property}-left,${property}-right`,
      `${label}-x`,
      inline,
      !all && Boolean(inline),
    );
    pushNumeric(
      `${property}-top`,
      `${label} top`,
      parseNumericValue(snapshot[blockProperties[0]]),
      !all && !block,
    );
    pushNumeric(
      `${property}-bottom`,
      `${label} bottom`,
      parseNumericValue(snapshot[blockProperties[1]]),
      !all && !block,
    );
    pushNumeric(
      `${property}-left`,
      `${label} left`,
      parseNumericValue(snapshot[inlineProperties[0]]),
      !all && !inline,
    );
    pushNumeric(
      `${property}-right`,
      `${label} right`,
      parseNumericValue(snapshot[inlineProperties[1]]),
      !all && !inline,
    );
  };

  pushBoxGroup(
    "padding",
    "padding",
    ["padding-top", "padding-right", "padding-bottom", "padding-left"],
    ["padding-top", "padding-bottom"],
    ["padding-left", "padding-right"],
  );

  pushBoxGroup(
    "margin",
    "margin",
    ["margin-top", "margin-right", "margin-bottom", "margin-left"],
    ["margin-top", "margin-bottom"],
    ["margin-left", "margin-right"],
  );

  pushNumeric("gap", "gap", valueWithFallback(snapshot, "gap"), true);
  pushNumeric("row-gap", "row gap", valueWithFallback(snapshot, "row-gap"), true);
  pushNumeric("column-gap", "column gap", valueWithFallback(snapshot, "column-gap"), true);

  pushNumeric("font-size", "font size", parseNumericValue(snapshot["font-size"]), true);
  pushNumeric("line-height", "line height", valueWithFallback(snapshot, "line-height"), true);
  pushNumeric("letter-spacing", "letter spacing", valueWithFallback(snapshot, "letter-spacing"), true);

  const allRadii = alignedValue(snapshot, [
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
  ]);
  pushNumeric("border-radius", "border radius", allRadii, Boolean(allRadii));
  pushNumeric(
    "border-top-left-radius",
    "top left radius",
    parseNumericValue(snapshot["border-top-left-radius"]),
    !allRadii,
  );
  pushNumeric(
    "border-top-right-radius",
    "top right radius",
    parseNumericValue(snapshot["border-top-right-radius"]),
    !allRadii,
  );
  pushNumeric(
    "border-bottom-right-radius",
    "bottom right radius",
    parseNumericValue(snapshot["border-bottom-right-radius"]),
    !allRadii,
  );
  pushNumeric(
    "border-bottom-left-radius",
    "bottom left radius",
    parseNumericValue(snapshot["border-bottom-left-radius"]),
    !allRadii,
  );
  pushNumeric("border-width", "border width", parseNumericValue(snapshot["border-width"]), true);

  pushNumeric("width", "width", parseNumericValue(snapshot["width"]), true);
  pushNumeric("height", "height", parseNumericValue(snapshot["height"]), true);
  pushNumeric("max-width", "max width", parseNumericValue(snapshot["max-width"]), true);
  pushNumeric("max-height", "max height", parseNumericValue(snapshot["max-height"]), true);
  pushNumeric("opacity", "opacity", parseNumericValue(snapshot["opacity"]), true);

  const prioritized = getElementTailwindProperties(element);
  return rankProperties(properties, prioritized);
};

// A property is "default" when its value is the typical resting state for
// that property — most elements don't care about it and shouldn't pollute the
// editor list with a row that says "0px". The EditPanel hides defaults by
// default but reveals them when the user searches.
const isDefaultPropertyValue = (property: EditableProperty): boolean => {
  const value = property.original;
  const name = property.property;

  if (name.startsWith("padding") || name.startsWith("margin")) return value === 0;
  if (name.includes("gap")) return value === 0;
  if (name === "border-width") return value === 0;
  if (name.endsWith("-radius") || name === "border-radius") return value === 0;
  if (name === "opacity") return value === 100;
  if (name === "letter-spacing") return value === 0;
  // width/height/max-* always have computed values from layout — hide them
  // unless the user explicitly chose them via a Tailwind class.
  if (name === "width" || name === "height" || name.startsWith("max-") || name.startsWith("min-")) {
    return true;
  }
  if (name === "line-height") {
    // "Default" is approximately font-size × 1.2 (browser "normal" heuristic).
    return value === 0;
  }
  return false;
};

// Two tiers, preserving insertion order within each:
//   1. Properties explicitly set by a Tailwind class on the element
//   2. Everything else
// Each property also gets an isDefault flag so the EditPanel can filter out
// rows that aren't worth showing unless the user actively searches for them.
const rankProperties = (
  properties: EditableProperty[],
  prioritized: Set<string>,
): EditableProperty[] => {
  const tier1: EditableProperty[] = [];
  const tier2: EditableProperty[] = [];

  for (const property of properties) {
    if (prioritized.has(property.property)) {
      tier1.push({ ...property, prioritized: true, isDefault: false });
      continue;
    }
    tier2.push({ ...property, isDefault: isDefaultPropertyValue(property) });
  }

  return [...tier1, ...tier2];
};

export const editablePropertyToCssProperties = (property: string): string[] =>
  property
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

const formatCssNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

export const formatEditableValue = (property: EditableProperty): string => {
  if (property.unit === "%" && property.property === "opacity") {
    return formatCssNumber(property.value / OPACITY_MAX_PERCENT);
  }
  return `${formatCssNumber(property.value)}${property.unit}`;
};
