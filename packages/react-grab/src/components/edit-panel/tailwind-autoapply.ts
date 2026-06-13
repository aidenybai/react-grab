import { batch, createMemo, type Accessor } from "solid-js";
import { EDIT_ROOT_FONT_SIZE_PX, TAILWIND_SPACING_UNIT_PX } from "../../constants.js";
import type {
  ColorEditableProperty,
  EditableProperty,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { expandAggregateLonghands } from "../../utils/expand-aggregate-longhands.js";
import { roundEditableNumericValue } from "../../utils/format-css-value.js";
import { isNumericDraftQuery } from "../../utils/is-numeric-draft-query.js";
import { parseAnyColor } from "../../utils/parse-any-color.js";
import { splitNegativePrefix } from "../../utils/split-negative-prefix.js";
import {
  normalizeTailwindClassInput,
  tailwindClassToEnumValue,
  tailwindColorPropertyForClassName,
  tailwindNamedColorHex,
  tailwindPrefixToProperty,
} from "../../utils/tailwind-class-map.js";

const TAILWIND_CLASS_PATTERN = /^([a-z-]+)-(-?\d+(?:\.\d+)?)$/;
const TAILWIND_ARBITRARY_PATTERN = /^(.+?)-\[(.+)]$/;
const INLINE_NUMERIC_VALUE_PATTERN = /^(-?\d*\.?\d+)\s*([a-zA-Z%]*)$/;
// A px/rem unit (or an explicit length:/size: data-type hint) marks a
// value as a length. Bare unitless values (opacity-[0.5], leading-[1.5])
// are ambiguous and em is element-relative, so those are skipped.
const ARBITRARY_LENGTH_PATTERN = /^(-?\d*\.?\d+)(px|rem)?$/i;
const ARBITRARY_LENGTH_HINT = /^(?:length|size):/i;

const LITERAL_NUMBER_KEYS = new Set([
  "opacity",
  "border-width",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "z-index",
  "font-weight",
]);

const findNumeric = (
  properties: readonly EditableProperty[],
  propertyKey: string,
): NumericEditableProperty | null => {
  for (const property of properties) {
    if (property.key === propertyKey && property.kind === "numeric") return property;
  }
  return null;
};

const findEnum = (
  properties: readonly EditableProperty[],
  propertyKey: string,
): EnumEditableProperty | null => {
  for (const property of properties) {
    if (property.key === propertyKey && property.kind === "enum") return property;
  }
  return null;
};

const findColor = (
  properties: readonly EditableProperty[],
  propertyKey: string,
): ColorEditableProperty | null => {
  for (const property of properties) {
    if (property.key === propertyKey && property.kind === "color") return property;
  }
  return null;
};

// Tailwind escapes spaces as underscores and may carry a type hint.
// Underscores inside var()/url() belong to the identifier, so leave
// those values untouched.
const cleanArbitraryValue = (rawValue: string): string => {
  const value = rawValue.replace(/^(?:color|length|size):/i, "").trim();
  return /(?:var|url)\(/i.test(value) ? value : value.replace(/_/g, " ");
};

const arbitraryPrefix = (rawPrefix: string): string => {
  const lastVariantColon = rawPrefix.lastIndexOf(":");
  const withoutVariant = lastVariantColon >= 0 ? rawPrefix.slice(lastVariantColon + 1) : rawPrefix;
  const withoutImportant = withoutVariant.startsWith("!")
    ? withoutVariant.slice(1)
    : withoutVariant;
  return withoutImportant.toLowerCase();
};

const parseArbitraryLengthPx = (value: string, allowUnitless: boolean): number | null => {
  const lengthMatch = value.match(ARBITRARY_LENGTH_PATTERN);
  if (!lengthMatch) return null;
  const unit = lengthMatch[2]?.toLowerCase();
  if (!unit && !allowUnitless) return null;
  const magnitude = Number.parseFloat(lengthMatch[1]);
  if (!Number.isFinite(magnitude)) return null;
  return unit === "rem" ? magnitude * EDIT_ROOT_FONT_SIZE_PX : magnitude;
};

const findNumericLonghands = (
  properties: readonly EditableProperty[],
  propertyKey: string,
): NumericEditableProperty[] => {
  const longhands = expandAggregateLonghands(propertyKey);
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
  roundEditableNumericValue(clampToRange(candidate, property.min, property.max));

interface TailwindAutoApplyOptions {
  initialProperties: readonly EditableProperty[];
  searchQuery: Accessor<string>;
  isCompact: Accessor<boolean>;
  activeProperty: Accessor<EditableProperty | null>;
  commit: (
    property: EditableProperty,
    value: number | string,
    options?: { shouldCompact?: boolean },
  ) => void;
  setIsCompact: (value: boolean) => void;
}

interface TailwindAutoApplyController {
  readonly isInlineNumericEdit: Accessor<boolean>;
  isInlineNumericDraft: (query: string) => boolean;
  tryApplyNumericValue: (query: string) => boolean;
  applyTailwindClass: (query: string) => void;
}

interface InlineNumericValue {
  value: number;
  unit: string;
}

export const createTailwindAutoApply = (
  options: TailwindAutoApplyOptions,
): TailwindAutoApplyController => {
  const { initialProperties, searchQuery, isCompact, activeProperty, commit, setIsCompact } =
    options;

  const hasTrackableTarget = (propertyKey: string): boolean => {
    for (const property of initialProperties) {
      if (
        property.key === propertyKey &&
        (property.kind === "numeric" || property.kind === "enum")
      ) {
        return true;
      }
    }
    return findNumericLonghands(initialProperties, propertyKey).length > 0;
  };

  const parseInlineNumericValue = (query: string): InlineNumericValue | null => {
    const valueMatch = query
      .trim()
      .replace(/(\d),(\d)/g, "$1.$2")
      .match(INLINE_NUMERIC_VALUE_PATTERN);
    if (!valueMatch) return null;
    const value = Number.parseFloat(valueMatch[1]);
    if (!Number.isFinite(value)) return null;
    return { value, unit: valueMatch[2].toLowerCase() };
  };

  const isUnitDraftForProperty = (unit: string, propertyUnit: string): boolean => {
    if (!unit) return true;
    return propertyUnit.toLowerCase().startsWith(unit);
  };

  const isInlineNumericDraft = (query: string): boolean => {
    if (!isCompact()) return false;
    const property = activeProperty();
    if (property?.kind !== "numeric") return false;
    const parsed = parseInlineNumericValue(query);
    if (parsed) return isUnitDraftForProperty(parsed.unit, property.unit);
    return isNumericDraftQuery(query);
  };

  const isInlineNumericEdit = createMemo(() => isInlineNumericDraft(searchQuery()));

  const tryApplyNumericToActive = (query: string): boolean => {
    if (!isCompact()) return false;
    const property = activeProperty();
    if (property?.kind !== "numeric") return false;
    const parsed = parseInlineNumericValue(query);
    if (!parsed) return false;
    const propertyUnit = property.unit.toLowerCase();
    if (parsed.unit !== "" && parsed.unit !== propertyUnit) {
      return isUnitDraftForProperty(parsed.unit, property.unit);
    }
    const nextValue = clampedFor(property, parsed.value);
    if (nextValue !== property.value) commit(property, nextValue);
    return true;
  };

  const commitLengthPx = (propertyKey: string, value: number): boolean => {
    const numericTarget = findNumeric(initialProperties, propertyKey);
    if (numericTarget) {
      // px lengths only apply to px-measured props, not opacity/z-index.
      if (numericTarget.unit !== "px") return false;
      setIsCompact(true);
      commit(numericTarget, clampedFor(numericTarget, value), { shouldCompact: true });
      return true;
    }
    const sideProperties = findNumericLonghands(initialProperties, propertyKey);
    if (sideProperties.length === 0) return false;
    setIsCompact(true);
    batch(() => {
      for (const sideProperty of sideProperties) {
        commit(sideProperty, clampedFor(sideProperty, value), { shouldCompact: true });
      }
    });
    return true;
  };

  // Single color-apply path for both spellings: arbitrary values
  // (`bg-[#f00]`, passed pre-parsed) and named palette tokens
  // (`bg-red-500`, resolved here). A null arbitraryValue means "resolve
  // the named token".
  const applyColorClass = (rawClass: string, arbitraryValue: string | null): boolean => {
    const colorCssKey = tailwindColorPropertyForClassName(rawClass);
    if (!colorCssKey) return false;
    const colorTarget = findColor(initialProperties, colorCssKey);
    if (!colorTarget) return false;
    const colorHex =
      arbitraryValue === null ? tailwindNamedColorHex(rawClass) : parseAnyColor(arbitraryValue);
    if (!colorHex) return false;
    setIsCompact(true);
    commit(colorTarget, colorHex, { shouldCompact: true });
    return true;
  };

  const applyArbitraryClass = (rawQuery: string): boolean => {
    const normalizedClass = rawQuery.trim();
    const arbitraryMatch = normalizedClass.match(TAILWIND_ARBITRARY_PATTERN);
    if (!arbitraryMatch) return false;
    const rawValue = arbitraryMatch[2];
    const value = cleanArbitraryValue(rawValue);
    if (applyColorClass(normalizedClass, value)) return true;

    const lengthPx = parseArbitraryLengthPx(value, ARBITRARY_LENGTH_HINT.test(rawValue.trim()));
    if (lengthPx === null) return false;
    const { isNegative, base: basePrefix } = splitNegativePrefix(arbitraryMatch[1]);
    const propertyKey = tailwindPrefixToProperty(arbitraryPrefix(basePrefix));
    return propertyKey ? commitLengthPx(propertyKey, isNegative ? -lengthPx : lengthPx) : false;
  };

  const applySingleClass = (rawQuery: string) => {
    if (applyArbitraryClass(rawQuery)) return;
    const query = normalizeTailwindClassInput(rawQuery);
    // Canonical negative spelling: `-m-4` is margin -16px. Only the
    // numeric path below understands the sign; colors and enums have
    // no negative forms.
    const { isNegative: isNegativePrefixed, base: baseQuery } = splitNegativePrefix(query);
    const intentPrefix = baseQuery.replace(/-\d*$/, "").replace(/-$/, "");
    const intentPropertyKey = intentPrefix ? tailwindPrefixToProperty(intentPrefix) : null;
    if (intentPropertyKey && hasTrackableTarget(intentPropertyKey)) setIsCompact(true);

    if (!isNegativePrefixed) {
      if (applyColorClass(query, null)) return;

      const enumMapping = tailwindClassToEnumValue(query);
      if (enumMapping) {
        const enumTarget = findEnum(initialProperties, enumMapping.property);
        if (!enumTarget) return;
        const option = enumTarget.options.find((entry) => entry.value === enumMapping.value);
        if (option) {
          setIsCompact(true);
          commit(enumTarget, option.value, { shouldCompact: true });
        }
        return;
      }
    }

    const tailwindClassMatch = baseQuery.match(TAILWIND_CLASS_PATTERN);
    if (!tailwindClassMatch) return;
    const propertyKey = tailwindPrefixToProperty(tailwindClassMatch[1]);
    if (!propertyKey) return;
    const rawNumber = Number.parseFloat(tailwindClassMatch[2]);
    if (!Number.isFinite(rawNumber)) return;
    const signedNumber = isNegativePrefixed ? -rawNumber : rawNumber;
    const candidate = LITERAL_NUMBER_KEYS.has(propertyKey)
      ? signedNumber
      : signedNumber * TAILWIND_SPACING_UNIT_PX;

    const numericTarget = findNumeric(initialProperties, propertyKey);
    if (numericTarget) {
      commit(numericTarget, clampedFor(numericTarget, candidate), { shouldCompact: true });
      return;
    }

    // Enum spellings like `font-700` are unsigned-only; a negative prefix
    // (`-font-700`) has no meaning, so don't let the unsigned rawNumber
    // resolve an enum option behind the sign's back.
    if (!isNegativePrefixed) {
      const enumTarget = findEnum(initialProperties, propertyKey);
      if (enumTarget) {
        const optionValue = String(rawNumber);
        const option = enumTarget.options.find((entry) => entry.value === optionValue);
        if (option) {
          commit(enumTarget, option.value, { shouldCompact: true });
          return;
        }
      }
    }

    const sideProperties = findNumericLonghands(initialProperties, propertyKey);
    if (sideProperties.length === 0) return;
    batch(() => {
      for (const sideProperty of sideProperties) {
        commit(sideProperty, clampedFor(sideProperty, candidate), { shouldCompact: true });
      }
    });
  };

  const isApplicableSingleClass = (normalizedQuery: string): boolean => {
    if (tailwindClassToEnumValue(normalizedQuery)) return true;
    const { base: baseQuery } = splitNegativePrefix(normalizedQuery);
    const tailwindClassMatch = baseQuery.match(TAILWIND_CLASS_PATTERN);
    if (!tailwindClassMatch) return false;
    const propertyKey = tailwindPrefixToProperty(tailwindClassMatch[1]);
    if (!propertyKey) return false;
    if (hasTrackableTarget(propertyKey)) return true;
    return findEnum(initialProperties, propertyKey) !== null;
  };

  const applyTailwindClass = (rawQuery: string) => {
    const strippedClassAttribute = rawQuery
      .trim()
      .replace(/^class\s*=\s*["']/, "")
      .replace(/["']\s*$/, "")
      // A space before `[` is a typo for the `-[` arbitrary-value
      // separator (`text [13px]` → `text-[13px]`); join it so the class
      // isn't split into separate tokens.
      .replace(/\s+\[/g, "-[");
    const normalizedStripped = normalizeTailwindClassInput(strippedClassAttribute);
    const tokens = strippedClassAttribute.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && !isApplicableSingleClass(normalizedStripped)) {
      for (const token of tokens) applySingleClass(token);
      return;
    }
    applySingleClass(strippedClassAttribute);
  };

  return {
    isInlineNumericEdit,
    isInlineNumericDraft,
    tryApplyNumericValue: tryApplyNumericToActive,
    applyTailwindClass,
  };
};
