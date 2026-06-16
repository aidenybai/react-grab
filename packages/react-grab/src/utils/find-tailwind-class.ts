import {
  TAILWIND_BORDER_MAX_PX,
  TAILWIND_OPACITY_GRANULARITY,
  TAILWIND_SPACING_MAX_UNITS,
  TAILWIND_SPACING_UNIT_PX,
  TAILWIND_Z_INDEX_MAX,
} from "../constants.js";

// Tailwind suffix scales the chip number differently per family:
// spacing/size/inset use the 4px unit, border-width and z-index are
// literal px/integers, opacity is a percent step.
type TailwindChipScale = "spacing" | "border-width" | "z-index" | "opacity";

interface TailwindChipRule {
  prefix: string;
  scale: TailwindChipScale;
}

// Single source of truth for the chip: the most-specific Tailwind prefix
// per row key (`pt` over `p` for padding-top, so the chip names the class
// the user would type) plus the suffix scale that prefix uses. Keys are
// EditableProperty.key spellings, including the comma-joined aggregate
// rows ("padding-top,padding-bottom" → `py`).
const PROPERTY_CHIP_RULES: Record<string, TailwindChipRule> = {
  padding: { prefix: "p", scale: "spacing" },
  "padding-top,padding-bottom": { prefix: "py", scale: "spacing" },
  "padding-left,padding-right": { prefix: "px", scale: "spacing" },
  "padding-top": { prefix: "pt", scale: "spacing" },
  "padding-right": { prefix: "pr", scale: "spacing" },
  "padding-bottom": { prefix: "pb", scale: "spacing" },
  "padding-left": { prefix: "pl", scale: "spacing" },
  margin: { prefix: "m", scale: "spacing" },
  "margin-top,margin-bottom": { prefix: "my", scale: "spacing" },
  "margin-left,margin-right": { prefix: "mx", scale: "spacing" },
  "margin-top": { prefix: "mt", scale: "spacing" },
  "margin-right": { prefix: "mr", scale: "spacing" },
  "margin-bottom": { prefix: "mb", scale: "spacing" },
  "margin-left": { prefix: "ml", scale: "spacing" },
  gap: { prefix: "gap", scale: "spacing" },
  "column-gap": { prefix: "gap-x", scale: "spacing" },
  "row-gap": { prefix: "gap-y", scale: "spacing" },
  "width,height": { prefix: "size", scale: "spacing" },
  width: { prefix: "w", scale: "spacing" },
  height: { prefix: "h", scale: "spacing" },
  "min-width": { prefix: "min-w", scale: "spacing" },
  "max-width": { prefix: "max-w", scale: "spacing" },
  "min-height": { prefix: "min-h", scale: "spacing" },
  "max-height": { prefix: "max-h", scale: "spacing" },
  "top,right,bottom,left": { prefix: "inset", scale: "spacing" },
  "top,bottom": { prefix: "inset-y", scale: "spacing" },
  "left,right": { prefix: "inset-x", scale: "spacing" },
  top: { prefix: "top", scale: "spacing" },
  right: { prefix: "right", scale: "spacing" },
  bottom: { prefix: "bottom", scale: "spacing" },
  left: { prefix: "left", scale: "spacing" },
  "border-width": { prefix: "border", scale: "border-width" },
  "border-top-width": { prefix: "border-t", scale: "border-width" },
  "border-right-width": { prefix: "border-r", scale: "border-width" },
  "border-bottom-width": { prefix: "border-b", scale: "border-width" },
  "border-left-width": { prefix: "border-l", scale: "border-width" },
  "z-index": { prefix: "z", scale: "z-index" },
  opacity: { prefix: "opacity", scale: "opacity" },
};

export const findTailwindClass = (propertyKey: string, value: number): string | null => {
  const rule = PROPERTY_CHIP_RULES[propertyKey];
  if (!rule) return null;
  const { prefix, scale } = rule;

  if (scale === "spacing") {
    if (value < 0) return null;
    const units = value / TAILWIND_SPACING_UNIT_PX;
    if (!Number.isInteger(units)) return null;
    if (units > TAILWIND_SPACING_MAX_UNITS) return null;
    return `${prefix}-${units}`;
  }

  if (scale === "border-width") {
    if (!Number.isInteger(value) || value < 0 || value > TAILWIND_BORDER_MAX_PX) return null;
    // 1px is the suffix-less form: `border` / `border-t`. Others get
    // numeric suffix: `border-2`, `border-t-4`, …
    if (value === 1) return prefix;
    return `${prefix}-${value}`;
  }

  if (scale === "z-index") {
    if (!Number.isInteger(value) || value < 0 || value > TAILWIND_Z_INDEX_MAX) return null;
    return `${prefix}-${value}`;
  }

  // Opacity is stored as percent [0, 100] (build-editable-properties
  // normalizes), so `value` already matches the chip number.
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  if (value % TAILWIND_OPACITY_GRANULARITY !== 0) return null;
  return `${prefix}-${value}`;
};
