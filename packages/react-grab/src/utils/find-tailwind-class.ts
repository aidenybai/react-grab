import {
  TAILWIND_BORDER_MAX_PX,
  TAILWIND_OPACITY_GRANULARITY,
  TAILWIND_SPACING_MAX_UNITS,
  TAILWIND_SPACING_UNIT_PX,
  TAILWIND_Z_INDEX_MAX,
} from "../constants.js";

// Reverse-lookup (CSS key, value) → canonical Tailwind class. Returns
// null for off-scale / unsupported values; the chip just hides.

const SPACING_PROPERTIES: ReadonlySet<string> = new Set([
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  "column-gap",
  "row-gap",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "top",
  "right",
  "bottom",
  "left",
]);

// Most-specific Tailwind prefix per CSS key — `pt` over `p` for
// padding-top so the chip names the longhand the user would type.
const PROPERTY_TO_BEST_PREFIX: Record<string, string> = {
  padding: "p",
  "padding-top": "pt",
  "padding-right": "pr",
  "padding-bottom": "pb",
  "padding-left": "pl",
  margin: "m",
  "margin-top": "mt",
  "margin-right": "mr",
  "margin-bottom": "mb",
  "margin-left": "ml",
  gap: "gap",
  "column-gap": "gap-x",
  "row-gap": "gap-y",
  width: "w",
  height: "h",
  "min-width": "min-w",
  "max-width": "max-w",
  "min-height": "min-h",
  "max-height": "max-h",
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
  "border-width": "border",
  "border-top-width": "border-t",
  "border-right-width": "border-r",
  "border-bottom-width": "border-b",
  "border-left-width": "border-l",
  "z-index": "z",
  opacity: "opacity",
};

export const findTailwindClass = (cssKey: string, value: number): string | null => {
  const prefix = PROPERTY_TO_BEST_PREFIX[cssKey];
  if (!prefix) return null;

  if (SPACING_PROPERTIES.has(cssKey)) {
    if (value < 0) return null;
    const units = value / TAILWIND_SPACING_UNIT_PX;
    if (!Number.isInteger(units)) return null;
    if (units > TAILWIND_SPACING_MAX_UNITS) return null;
    return `${prefix}-${units}`;
  }

  if (cssKey === "border-width" || cssKey.endsWith("-width")) {
    if (!Number.isInteger(value) || value < 0 || value > TAILWIND_BORDER_MAX_PX) return null;
    // 1px is the suffix-less form: `border` / `border-t`. Others get
    // numeric suffix: `border-2`, `border-t-4`, …
    if (value === 1) return prefix;
    return `${prefix}-${value}`;
  }

  if (cssKey === "z-index") {
    if (!Number.isInteger(value) || value < 0 || value > TAILWIND_Z_INDEX_MAX) return null;
    return `${prefix}-${value}`;
  }

  if (cssKey === "opacity") {
    // Opacity is stored as percent [0, 100] (build-editable-properties
    // normalizes), so `value` already matches the chip number.
    if (!Number.isFinite(value) || value < 0 || value > 100) return null;
    if (value % TAILWIND_OPACITY_GRANULARITY !== 0) return null;
    return `${prefix}-${value}`;
  }

  return null;
};
