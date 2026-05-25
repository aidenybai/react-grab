import { createMemo, type Accessor } from "solid-js";
import { TAILWIND_SPACING_UNIT_PX } from "../../constants.js";
import type {
  EditableProperty,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { expandAggregateLonghands } from "../../utils/expand-aggregate-longhands.js";
import { cleanNumericValue } from "../../utils/format-css-value.js";
import { isNumericQuery } from "../../utils/is-numeric-query.js";
import { tailwindPrefixToProperty } from "../../utils/tailwind-class-map.js";

const TAILWIND_CLASS_PATTERN = /^([a-z-]+)-(-?\d+(?:\.\d+)?)$/;

// Accept `py 40`, `py40`, `py-40` — all normalize to the canonical
// `py-40` form before pattern matching. Collapses whitespace runs into
// a single hyphen, then inserts a hyphen between a letter and an
// immediately-following digit when one is missing.
const normalizeQuery = (query: string): string =>
  query
    .trim()
    .replace(/\s+/g, "-")
    .replace(/([a-z])(\d)/g, "$1-$2");

// Take the typed number literally instead of multiplying by the 4px
// spacing scale: opacity-50, border-2, z-10, font-700.
const LITERAL_NUMBER_KEYS = new Set(["opacity", "border-width", "z-index", "font-weight"]);

const findNumeric = (
  properties: readonly EditableProperty[],
  cssKey: string,
): NumericEditableProperty | null => {
  for (const property of properties) {
    if (property.key === cssKey && property.kind === "numeric") return property;
  }
  return null;
};

const findEnum = (
  properties: readonly EditableProperty[],
  cssKey: string,
): EnumEditableProperty | null => {
  for (const property of properties) {
    if (property.key === cssKey && property.kind === "enum") return property;
  }
  return null;
};

const findNumericLonghands = (
  properties: readonly EditableProperty[],
  cssKey: string,
): NumericEditableProperty[] => {
  const longhands = expandAggregateLonghands(cssKey);
  const matches: NumericEditableProperty[] = [];
  for (const property of properties) {
    if (longhands.includes(property.key) && property.kind === "numeric") {
      matches.push(property);
    }
  }
  return matches;
};

const clampedFor = (property: NumericEditableProperty, candidate: number): number =>
  cleanNumericValue(clampToRange(candidate, property.min, property.max));

interface TailwindAutoApplyOptions {
  initialProperties: readonly EditableProperty[];
  searchQuery: Accessor<string>;
  isCompact: Accessor<boolean>;
  activeProperty: Accessor<EditableProperty | null>;
  commit: (
    property: EditableProperty,
    value: number | string,
    options?: { compact?: boolean },
  ) => void;
  setIsCompact: (value: boolean) => void;
}

export interface TailwindAutoApplyController {
  // True while the caller should keep the search textarea hidden in
  // compact mode — a literal number is streaming through to the active
  // numeric row.
  readonly isInlineNumericEdit: Accessor<boolean>;
  // Returns true when the query was consumed as a value; the caller
  // skips its normal search flow so the active row stays locked.
  tryApplyNumericValue: (query: string) => boolean;
  // Caller must run its normal search-flow setIsCompact(false) BEFORE
  // this so the intent-driven setIsCompact(true) lands last.
  applyTailwindClass: (query: string) => void;
}

export const createTailwindAutoApply = (
  options: TailwindAutoApplyOptions,
): TailwindAutoApplyController => {
  const { initialProperties, searchQuery, isCompact, activeProperty, commit, setIsCompact } =
    options;

  const hasTrackableTarget = (cssKey: string): boolean => {
    for (const property of initialProperties) {
      if (property.key === cssKey && (property.kind === "numeric" || property.kind === "enum")) {
        return true;
      }
    }
    return findNumericLonghands(initialProperties, cssKey).length > 0;
  };

  const isInlineNumericEdit = createMemo(() => {
    if (!isCompact()) return false;
    const property = activeProperty();
    if (property?.kind !== "numeric") return false;
    return isNumericQuery(searchQuery());
  });

  const applyNumericToActive = (query: string): boolean => {
    if (!isCompact() || !isNumericQuery(query)) return false;
    const property = activeProperty();
    if (property?.kind !== "numeric") return false;
    const parsed = Number.parseFloat(query);
    if (!Number.isFinite(parsed)) return false;
    const next = clampedFor(property, parsed);
    if (next !== property.value) commit(property, next);
    return true;
  };

  const applyTailwindClass = (rawQuery: string) => {
    const query = normalizeQuery(rawQuery);
    // `mt`, `mt-`, `mt-4` all distill to the prefix `mt` for intent —
    // collapse to compact before any value is written.
    const intentPrefix = query.replace(/-\d*$/, "").replace(/-$/, "");
    const intentCssKey = intentPrefix ? tailwindPrefixToProperty(intentPrefix) : null;
    if (intentCssKey && hasTrackableTarget(intentCssKey)) setIsCompact(true);

    const match = query.match(TAILWIND_CLASS_PATTERN);
    if (!match) return;
    const cssKey = tailwindPrefixToProperty(match[1]);
    if (!cssKey) return;
    const rawNumber = Number.parseFloat(match[2]);
    if (!Number.isFinite(rawNumber)) return;
    const candidate = LITERAL_NUMBER_KEYS.has(cssKey)
      ? rawNumber
      : rawNumber * TAILWIND_SPACING_UNIT_PX;

    const numericTarget = findNumeric(initialProperties, cssKey);
    if (numericTarget) {
      commit(numericTarget, clampedFor(numericTarget, candidate), { compact: true });
      return;
    }

    // font-weight is an enum row but the canonical class is numeric
    // (font-700) — commit by option value match.
    const enumTarget = findEnum(initialProperties, cssKey);
    if (enumTarget) {
      const optionValue = String(rawNumber);
      const option = enumTarget.options.find((entry) => entry.value === optionValue);
      if (option) {
        commit(enumTarget, option.value, { compact: true });
        return;
      }
    }

    // Aggregate fan-out when the shorthand isn't a tracked row (non-
    // uniform sides) — write to each covered longhand.
    for (const side of findNumericLonghands(initialProperties, cssKey)) {
      commit(side, clampedFor(side, candidate), { compact: true });
    }
  };

  return {
    isInlineNumericEdit,
    tryApplyNumericValue: applyNumericToActive,
    applyTailwindClass,
  };
};
