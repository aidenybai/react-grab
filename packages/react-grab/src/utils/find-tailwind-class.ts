import {
  TAILWIND_BORDER_MAX_PX,
  TAILWIND_OPACITY_GRANULARITY,
  TAILWIND_SPACING_MAX_UNITS,
  TAILWIND_SPACING_UNIT_PX,
  TAILWIND_Z_INDEX_MAX,
} from "../constants.js";

// Reverse-lookup from (CSS property, numeric value) to the canonical
// Tailwind class string. Used by the edit panel's "token chip" — when
// the user's tweak lands exactly on a design-system stop we show e.g.
// `· p-4` after the raw number so they know they're on a known token.
//
// Returns null when the value doesn't match any concise Tailwind
// utility (off-scale, negative when not allowed, etc.) — the chip just
// hides in that case.

// Spacing-scale: padding/margin/gap/sizing/positioning all map
// `value px = (units * 4) px`, so the chip is `prefix-units` when
// `value % 4 === 0`. Same scale handles negative margins
// (`-mt-4` for -16px) but the chip elides the leading dash here —
// users rarely hand-author negative spacing and the chip is a hint,
// not a complete substitution.
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

// Per-property "best" Tailwind prefix — picks the most specific
// longhand alias so the chip reads as the canonical class the user
// would type, not an aggregate that touches other sides.
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
    // `border` (no suffix) means 1px on the aggregate; `border-t`
    // (also no suffix) means 1px on that side. Other widths get the
    // numeric suffix: `border-2`, `border-t-4`, …
    if (value === 1) return prefix;
    return `${prefix}-${value}`;
  }

  if (cssKey === "z-index") {
    if (!Number.isInteger(value) || value < 0 || value > TAILWIND_Z_INDEX_MAX) return null;
    return `${prefix}-${value}`;
  }

  if (cssKey === "opacity") {
    // The edit panel stores opacity as a percent in [0, 100] (see
    // build-editable-properties.normalizeForEdit), so `value` here is
    // already the chip number we want — granularity check just keeps
    // arbitrary off-scale numbers from getting chipped.
    if (!Number.isFinite(value) || value < 0 || value > 100) return null;
    if (value % TAILWIND_OPACITY_GRANULARITY !== 0) return null;
    return `${prefix}-${value}`;
  }

  return null;
};
