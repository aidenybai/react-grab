import { batch, createMemo, type Accessor } from "solid-js";
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
import {
  tailwindClassToEnumValue,
  tailwindPrefixToProperty,
} from "../../utils/tailwind-class-map.js";

const TAILWIND_CLASS_PATTERN = /^([a-z-]+)-(-?\d+(?:\.\d+)?)$/;

// Accept `py 40`, `py40`, `py-40`, `Py-40` (iOS auto-capitalize) —
// all normalize to the canonical `py-40` form before pattern matching.
// Lowercases (iOS Safari uppercases the first character of a textarea
// by default), collapses whitespace runs into a single hyphen, then
// inserts a hyphen between a letter and an immediately-following digit
// when one is missing.
const normalizeQuery = (query: string): string =>
  query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/([a-z])(\d)/g, "$1-$2");

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
  const matchedByRowKey = new Map<string, NumericEditableProperty>();
  for (const longhand of longhands) {
    for (const property of properties) {
      if (property.kind !== "numeric") continue;
      if (!property.cssProperties.includes(longhand)) continue;
      matchedByRowKey.set(property.key, property);
    }
  }
  return Array.from(matchedByRowKey.values());
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
  readonly isInlineNumericEdit: Accessor<boolean>;
  tryApplyNumericValue: (query: string) => boolean;
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

  const applySingleClass = (rawQuery: string) => {
    const query = normalizeQuery(rawQuery);
    const intentPrefix = query.replace(/-\d*$/, "").replace(/-$/, "");
    const intentCssKey = intentPrefix ? tailwindPrefixToProperty(intentPrefix) : null;
    if (intentCssKey && hasTrackableTarget(intentCssKey)) setIsCompact(true);

    const enumMapping = tailwindClassToEnumValue(query);
    if (enumMapping) {
      const enumTarget = findEnum(initialProperties, enumMapping.property);
      if (!enumTarget) return;
      const option = enumTarget.options.find((entry) => entry.value === enumMapping.value);
      if (option) {
        setIsCompact(true);
        commit(enumTarget, option.value, { compact: true });
      }
      return;
    }

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

    const enumTarget = findEnum(initialProperties, cssKey);
    if (enumTarget) {
      const optionValue = String(rawNumber);
      const option = enumTarget.options.find((entry) => entry.value === optionValue);
      if (option) {
        commit(enumTarget, option.value, { compact: true });
        return;
      }
    }

    const sideProperties = findNumericLonghands(initialProperties, cssKey);
    if (sideProperties.length === 0) return;
    batch(() => {
      for (const sideProperty of sideProperties) {
        commit(sideProperty, clampedFor(sideProperty, candidate), { compact: true });
      }
    });
  };

  const applyTailwindClass = (rawQuery: string) => {
    const stripped = rawQuery
      .trim()
      .replace(/^class\s*=\s*["']/, "")
      .replace(/["']\s*$/, "");
    const normalizedStripped = normalizeQuery(stripped);
    const shouldApplyAsSingleClass =
      TAILWIND_CLASS_PATTERN.test(normalizedStripped) ||
      tailwindClassToEnumValue(normalizedStripped) !== null;
    const tokens = stripped.split(/\s+/).filter(Boolean);
    if (shouldApplyAsSingleClass) {
      applySingleClass(stripped);
      return;
    }
    if (tokens.length <= 1) {
      applySingleClass(stripped);
      return;
    }
    for (const token of tokens) applySingleClass(token);
  };

  return {
    isInlineNumericEdit,
    tryApplyNumericValue: applyNumericToActive,
    applyTailwindClass,
  };
};
