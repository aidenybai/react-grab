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

  // Emit every aggregate variant that has an aligned value, tagging
  // canonical = the largest aggregate that covers each longhand at the
  // same value. With this, `padding` is canonical when all 4 sides are
  // uniform, `padding-y`/`padding-x` are canonical when the y/x pairs
  // are uniform but the four don't share a value, etc. The algorithm
  // generalises to any longhand layout: padding, margin, border-radius
  // (with t/b/l/r), border-width, etc.
  const pushAggregateGroup = (
    aggregates: Array<{
      property: string;
      label: string;
      longhands: TrackedProperty[];
    }>,
  ) => {
    const valued = aggregates
      .map((aggregate) => ({
        ...aggregate,
        value: aggregate.longhands.length === 1
          ? parseNumericValue(snapshot[aggregate.longhands[0]])
          : alignedValue(snapshot, aggregate.longhands),
      }))
      .filter(
        (aggregate): aggregate is typeof aggregate & { value: NumericValue } =>
          aggregate.value !== null,
      );

    const canonicalForLonghand = new Map<TrackedProperty, typeof valued[number]>();
    for (const aggregate of valued) {
      for (const longhand of aggregate.longhands) {
        const current = canonicalForLonghand.get(longhand);
        if (!current || aggregate.longhands.length > current.longhands.length) {
          canonicalForLonghand.set(longhand, aggregate);
        }
      }
    }
    const canonicalSet = new Set(canonicalForLonghand.values());

    for (const aggregate of valued) {
      pushNumeric(aggregate.property, aggregate.label, aggregate.value, canonicalSet.has(aggregate));
    }
  };

  const boxAggregates = (label: string, property: string) => [
    {
      property,
      label,
      longhands: [
        `${property}-top`,
        `${property}-right`,
        `${property}-bottom`,
        `${property}-left`,
      ] as TrackedProperty[],
    },
    {
      property: `${property}-top,${property}-bottom`,
      label: `${label}-y`,
      longhands: [`${property}-top`, `${property}-bottom`] as TrackedProperty[],
    },
    {
      property: `${property}-left,${property}-right`,
      label: `${label}-x`,
      longhands: [`${property}-left`, `${property}-right`] as TrackedProperty[],
    },
    {
      property: `${property}-top`,
      label: `${label} top`,
      longhands: [`${property}-top`] as TrackedProperty[],
    },
    {
      property: `${property}-right`,
      label: `${label} right`,
      longhands: [`${property}-right`] as TrackedProperty[],
    },
    {
      property: `${property}-bottom`,
      label: `${label} bottom`,
      longhands: [`${property}-bottom`] as TrackedProperty[],
    },
    {
      property: `${property}-left`,
      label: `${label} left`,
      longhands: [`${property}-left`] as TrackedProperty[],
    },
  ];

  pushAggregateGroup(boxAggregates("padding", "padding"));
  pushAggregateGroup(boxAggregates("margin", "margin"));

  const rowGap = valueWithFallback(snapshot, "row-gap");
  const columnGap = valueWithFallback(snapshot, "column-gap");
  const gapAligned =
    rowGap &&
    columnGap &&
    rowGap.unit === columnGap.unit &&
    Math.abs(rowGap.value - columnGap.value) < ALIGNED_VALUE_TOLERANCE_PX
      ? rowGap
      : null;
  pushNumeric("gap", "gap", gapAligned, Boolean(gapAligned));
  pushNumeric("row-gap", "row gap", rowGap, !gapAligned);
  pushNumeric("column-gap", "column gap", columnGap, !gapAligned);

  pushNumeric("font-size", "font size", parseNumericValue(snapshot["font-size"]), true);
  pushNumeric("line-height", "line height", valueWithFallback(snapshot, "line-height"), true);
  pushNumeric("letter-spacing", "letter spacing", valueWithFallback(snapshot, "letter-spacing"), true);

  // Border-radius has four corners with two orthogonal groupings: top/bottom
  // (rounded-t / rounded-b) and left/right (rounded-l / rounded-r). Aligned
  // values consolidate into the highest-level form that captures them; the
  // others stay available via search (Tailwind aliases rounded-tl, rounded-tr,
  // rounded-bl, rounded-br, rounded-t/b/l/r all map through).
  pushAggregateGroup([
    {
      property: "border-radius",
      label: "border radius",
      longhands: [
        "border-top-left-radius",
        "border-top-right-radius",
        "border-bottom-right-radius",
        "border-bottom-left-radius",
      ],
    },
    {
      property: "border-top-left-radius,border-top-right-radius",
      label: "top corners",
      longhands: ["border-top-left-radius", "border-top-right-radius"],
    },
    {
      property: "border-bottom-left-radius,border-bottom-right-radius",
      label: "bottom corners",
      longhands: ["border-bottom-left-radius", "border-bottom-right-radius"],
    },
    {
      property: "border-top-left-radius,border-bottom-left-radius",
      label: "left corners",
      longhands: ["border-top-left-radius", "border-bottom-left-radius"],
    },
    {
      property: "border-top-right-radius,border-bottom-right-radius",
      label: "right corners",
      longhands: ["border-top-right-radius", "border-bottom-right-radius"],
    },
    {
      property: "border-top-left-radius",
      label: "top left radius",
      longhands: ["border-top-left-radius"],
    },
    {
      property: "border-top-right-radius",
      label: "top right radius",
      longhands: ["border-top-right-radius"],
    },
    {
      property: "border-bottom-right-radius",
      label: "bottom right radius",
      longhands: ["border-bottom-right-radius"],
    },
    {
      property: "border-bottom-left-radius",
      label: "bottom left radius",
      longhands: ["border-bottom-left-radius"],
    },
  ]);
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
  // line-height is always computed (defaults to font-size × 1.2 in browsers).
  // There's no clean "is at default" heuristic without re-parsing CSS, so we
  // hide it by default; users surface it via search or a Tailwind class.
  if (name === "line-height") return true;
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
