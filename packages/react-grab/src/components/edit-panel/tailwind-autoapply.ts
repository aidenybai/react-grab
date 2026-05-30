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
import { isNumericQuery } from "../../utils/is-numeric-query.js";
import { parseAnyColor } from "../../utils/parse-any-color.js";
import {
  normalizeTailwindClassInput,
  tailwindClassToEnumValue,
  tailwindColorPropertyForClassName,
  tailwindPrefixToProperty,
} from "../../utils/tailwind-class-map.js";

const TAILWIND_CLASS_PATTERN = /^([a-z-]+)-(-?\d+(?:\.\d+)?)$/;
// Matches a tailwind arbitrary-value class: `<prefix>-[<value>]`, e.g.
// `bg-[#ff0000]`, `text-[rgb(0_0_0)]`, `text-[13px]`, `max-w-[200px]`.
const TAILWIND_ARBITRARY_PATTERN = /^(.+?)-\[(.+)]$/;
const ARBITRARY_LENGTH_PATTERN = /^(-?\d*\.?\d+)(px|rem|em)?$/i;

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

const findColor = (
  properties: readonly EditableProperty[],
  cssKey: string,
): ColorEditableProperty | null => {
  for (const property of properties) {
    if (property.key === cssKey && property.kind === "color") return property;
  }
  return null;
};

// Tailwind arbitrary values escape spaces as underscores (`rgb(0_0_0)`)
// and may carry a `color:`/`length:`/`size:` data-type hint.
const cleanArbitraryValue = (rawValue: string): string =>
  rawValue
    .replace(/_/g, " ")
    .replace(/^(?:color|length|size):/i, "")
    .trim();

const arbitraryPrefix = (rawPrefix: string): string => {
  const lastVariantColon = rawPrefix.lastIndexOf(":");
  const withoutVariant = lastVariantColon >= 0 ? rawPrefix.slice(lastVariantColon + 1) : rawPrefix;
  const withoutImportant = withoutVariant.startsWith("!")
    ? withoutVariant.slice(1)
    : withoutVariant;
  return withoutImportant.toLowerCase();
};

const parseArbitraryLengthPx = (value: string): number | null => {
  const lengthMatch = value.match(ARBITRARY_LENGTH_PATTERN);
  if (!lengthMatch) return null;
  const magnitude = Number.parseFloat(lengthMatch[1]);
  if (!Number.isFinite(magnitude)) return null;
  const unit = (lengthMatch[2] ?? "px").toLowerCase();
  return unit === "rem" || unit === "em" ? magnitude * EDIT_ROOT_FONT_SIZE_PX : magnitude;
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

export interface TailwindAutoApplyController {
  readonly isInlineNumericEdit: Accessor<boolean>;
  isInlineNumericDraft: (query: string) => boolean;
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

  const isInlineNumericDraft = (query: string): boolean => {
    if (!isCompact()) return false;
    const property = activeProperty();
    if (property?.kind !== "numeric") return false;
    return isNumericDraftQuery(query);
  };

  const isInlineNumericEdit = createMemo(() => isInlineNumericDraft(searchQuery()));

  const tryApplyNumericToActive = (query: string): boolean => {
    if (!isInlineNumericDraft(query) || !isNumericQuery(query)) return false;
    const property = activeProperty();
    if (property?.kind !== "numeric") return false;
    const parsed = Number.parseFloat(query);
    if (!Number.isFinite(parsed)) return false;
    const nextValue = clampedFor(property, parsed);
    if (nextValue !== property.value) commit(property, nextValue);
    return true;
  };

  // `bg-[#ff0000]`, `text-[rgb(0_0_0)]`, `border-[hsl(...)]` → set the
  // color property. Length-valued classes like `text-[13px]` are NOT
  // colors (tailwindColorPropertyForClassName excludes them) and fall
  // through to the length handler below.
  const applyArbitraryColorClass = (rawQuery: string): boolean => {
    const arbitraryMatch = rawQuery.trim().match(TAILWIND_ARBITRARY_PATTERN);
    if (!arbitraryMatch) return false;
    const colorCssKey = tailwindColorPropertyForClassName(rawQuery.trim());
    if (!colorCssKey) return false;
    const colorTarget = findColor(initialProperties, colorCssKey);
    if (!colorTarget) return false;
    const normalizedHex = parseAnyColor(cleanArbitraryValue(arbitraryMatch[2]));
    if (!normalizedHex) return false;
    setIsCompact(true);
    commit(colorTarget, normalizedHex, { shouldCompact: true });
    return true;
  };

  // `text-[13px]`, `w-[200px]`, `p-[1.5rem]` → set the dimensional
  // property. Routing `text-[13px]` here (font size) is what keeps it
  // from being mistaken for a text color.
  const applyArbitraryLengthClass = (rawQuery: string): boolean => {
    const arbitraryMatch = rawQuery.trim().match(TAILWIND_ARBITRARY_PATTERN);
    if (!arbitraryMatch) return false;
    const px = parseArbitraryLengthPx(cleanArbitraryValue(arbitraryMatch[2]));
    if (px === null) return false;
    const cssKey = tailwindPrefixToProperty(arbitraryPrefix(arbitraryMatch[1]));
    if (!cssKey) return false;
    const numericTarget = findNumeric(initialProperties, cssKey);
    if (numericTarget) {
      setIsCompact(true);
      commit(numericTarget, clampedFor(numericTarget, px), { shouldCompact: true });
      return true;
    }
    const sideProperties = findNumericLonghands(initialProperties, cssKey);
    if (sideProperties.length === 0) return false;
    setIsCompact(true);
    batch(() => {
      for (const sideProperty of sideProperties) {
        commit(sideProperty, clampedFor(sideProperty, px), { shouldCompact: true });
      }
    });
    return true;
  };

  const applySingleClass = (rawQuery: string) => {
    if (applyArbitraryColorClass(rawQuery)) return;
    if (applyArbitraryLengthClass(rawQuery)) return;
    const query = normalizeTailwindClassInput(rawQuery);
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
        commit(enumTarget, option.value, { shouldCompact: true });
      }
      return;
    }

    const tailwindClassMatch = query.match(TAILWIND_CLASS_PATTERN);
    if (!tailwindClassMatch) return;
    const cssKey = tailwindPrefixToProperty(tailwindClassMatch[1]);
    if (!cssKey) return;
    const rawNumber = Number.parseFloat(tailwindClassMatch[2]);
    if (!Number.isFinite(rawNumber)) return;
    const candidate = LITERAL_NUMBER_KEYS.has(cssKey)
      ? rawNumber
      : rawNumber * TAILWIND_SPACING_UNIT_PX;

    const numericTarget = findNumeric(initialProperties, cssKey);
    if (numericTarget) {
      commit(numericTarget, clampedFor(numericTarget, candidate), { shouldCompact: true });
      return;
    }

    const enumTarget = findEnum(initialProperties, cssKey);
    if (enumTarget) {
      const optionValue = String(rawNumber);
      const option = enumTarget.options.find((entry) => entry.value === optionValue);
      if (option) {
        commit(enumTarget, option.value, { shouldCompact: true });
        return;
      }
    }

    const sideProperties = findNumericLonghands(initialProperties, cssKey);
    if (sideProperties.length === 0) return;
    batch(() => {
      for (const sideProperty of sideProperties) {
        commit(sideProperty, clampedFor(sideProperty, candidate), { shouldCompact: true });
      }
    });
  };

  const isApplicableSingleClass = (normalizedQuery: string): boolean => {
    if (tailwindClassToEnumValue(normalizedQuery)) return true;
    const tailwindClassMatch = normalizedQuery.match(TAILWIND_CLASS_PATTERN);
    if (!tailwindClassMatch) return false;
    const cssKey = tailwindPrefixToProperty(tailwindClassMatch[1]);
    if (!cssKey) return false;
    if (hasTrackableTarget(cssKey)) return true;
    return findEnum(initialProperties, cssKey) !== null;
  };

  const applyTailwindClass = (rawQuery: string) => {
    const strippedClassAttribute = rawQuery
      .trim()
      .replace(/^class\s*=\s*["']/, "")
      .replace(/["']\s*$/, "");
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
