import type { DesignTokenResolver } from "../types.js";
import { roundEditableNumericValue } from "./format-css-value.js";
import { parseAnyColor } from "./parse-any-color.js";
import { parseNumericValue } from "./parse-numeric-value.js";

// Design tokens are surfaced through CSS custom properties regardless of
// the styling library (shadcn, Radix, Chakra, MUI, Tailwind v4 `@theme`,
// Panda, vanilla-extract, …), so reading the cascade's `--*` declarations
// keeps token resolution library-agnostic instead of hard-coding one
// framework's scale.

type TokenFamily =
  | "spacing"
  | "size"
  | "radius"
  | "font-size"
  | "line-height"
  | "letter-spacing"
  | "border-width";

interface LengthToken {
  name: string;
  family: TokenFamily;
}

// Ordered most-specific first so first-match-wins resolves `--font-size-*` to
// font-size before the generic "size" keyword (and `letter`/`leading` before
// the geometric families), preventing typography tokens from leaking into the
// width/height scale.
const FAMILY_NAME_KEYWORDS: ReadonlyArray<{ keyword: string; family: TokenFamily }> = [
  { keyword: "letter", family: "letter-spacing" },
  { keyword: "tracking", family: "letter-spacing" },
  { keyword: "leading", family: "line-height" },
  { keyword: "line-height", family: "line-height" },
  { keyword: "lineheight", family: "line-height" },
  { keyword: "radius", family: "radius" },
  { keyword: "rounded", family: "radius" },
  { keyword: "corner", family: "radius" },
  { keyword: "font-size", family: "font-size" },
  { keyword: "fontsize", family: "font-size" },
  { keyword: "text", family: "font-size" },
  { keyword: "stroke", family: "border-width" },
  { keyword: "border-width", family: "border-width" },
  { keyword: "borderwidth", family: "border-width" },
  { keyword: "space", family: "spacing" },
  { keyword: "gap", family: "spacing" },
  { keyword: "gutter", family: "spacing" },
  { keyword: "inset", family: "spacing" },
  { keyword: "padding", family: "spacing" },
  { keyword: "margin", family: "spacing" },
  { keyword: "size", family: "size" },
  { keyword: "width", family: "size" },
  { keyword: "height", family: "size" },
];

const familyForTokenName = (tokenName: string): TokenFamily | null => {
  const normalizedName = tokenName.toLowerCase();
  for (const { keyword, family } of FAMILY_NAME_KEYWORDS) {
    if (normalizedName.includes(keyword)) return family;
  }
  return null;
};

const familyForCssProperty = (cssProperty: string): TokenFamily | null => {
  if (cssProperty.includes("radius")) return "radius";
  if (cssProperty.endsWith("-width") && cssProperty.includes("border")) return "border-width";
  if (cssProperty === "font-size") return "font-size";
  if (cssProperty === "line-height") return "line-height";
  if (cssProperty === "letter-spacing") return "letter-spacing";
  if (
    cssProperty.startsWith("padding") ||
    cssProperty.startsWith("margin") ||
    cssProperty.endsWith("gap") ||
    cssProperty === "top" ||
    cssProperty === "right" ||
    cssProperty === "bottom" ||
    cssProperty === "left" ||
    cssProperty.startsWith("inset")
  ) {
    return "spacing";
  }
  if (
    cssProperty === "width" ||
    cssProperty === "height" ||
    cssProperty.startsWith("min-") ||
    cssProperty.startsWith("max-")
  ) {
    return "size";
  }
  return null;
};

const lengthValueToPx = (rawValue: string): number | null => {
  const parsed = parseNumericValue(rawValue);
  // Only true lengths (px/rem/em resolve to px); reject %, unitless ratios,
  // calc(), and keywords so font-weight/line-height values aren't mistaken for
  // a length scale.
  if (!parsed || parsed.unit !== "px") return null;
  return roundEditableNumericValue(parsed.value);
};

// A token reference is only useful if it is shorter / more semantic than
// the literal, so ties resolve to the shortest name (then alphabetically)
// for a deterministic, library-independent pick.
const preferToken = (candidate: string, incumbent: string | null): boolean => {
  if (incumbent === null) return true;
  if (candidate.length !== incumbent.length) return candidate.length < incumbent.length;
  return candidate < incumbent;
};

// Discrete scales (Radix/Chakra spacing, Tailwind `--text-*`, …) snap to the
// neighbouring token; an off-scale value returns null so the caller can fall
// back to a raw step instead of teleporting across the scale.
const nextValueInScale = (
  scale: readonly number[],
  current: number,
  direction: 1 | -1,
): number | null => {
  if (direction === 1) {
    // First token above current. Also pulls a below-scale value up onto the
    // floor; yields null past the top token so the caller falls back to raw.
    for (const value of scale) {
      if (value > current) return value;
    }
    return null;
  }
  // First token below current. Also pulls an above-scale value down onto the
  // top token; yields null past the floor so the caller falls back to raw.
  for (let scaleIndex = scale.length - 1; scaleIndex >= 0; scaleIndex--) {
    if (scale[scaleIndex] < current) return scale[scaleIndex];
  }
  return null;
};

// Tailwind exposes spacing/sizing as `calc(var(--spacing) * N)` with a single
// base unit rather than discrete tokens, so the arrows walk that grid.
const nextValueOnGrid = (current: number, direction: 1 | -1, unitPx: number): number | null => {
  const gridIndex =
    direction === 1 ? Math.floor(current / unitPx) + 1 : Math.ceil(current / unitPx) - 1;
  const next = gridIndex * unitPx;
  return next < 0 ? null : next;
};

// The custom-property *names* are document-global and unchanged across element
// switches, so the (O(rules)) stylesheet walk is memoized. Keying on the sheet
// count invalidates it when stylesheets are added/removed (HMR, dynamic styles)
// — token name sets effectively never change without that. Values still resolve
// per element since custom properties cascade/scope.
let cachedNames: { styleSheetCount: number; names: Set<string> } | null = null;

const collectCustomPropertyNames = (): Set<string> => {
  const styleSheetCount = document.styleSheets.length;
  if (cachedNames && cachedNames.styleSheetCount === styleSheetCount) return cachedNames.names;

  const customPropertyNames = new Set<string>();
  for (const styleSheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      // Cross-origin stylesheets throw on `.cssRules` access.
      rules = styleSheet.cssRules;
    } catch {
      continue;
    }
    collectNamesFromRules(rules, customPropertyNames);
  }
  cachedNames = { styleSheetCount, names: customPropertyNames };
  return customPropertyNames;
};

const collectNamesFromRules = (rules: CSSRuleList, customPropertyNames: Set<string>) => {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const declaration = rule.style;
      for (let propertyIndex = 0; propertyIndex < declaration.length; propertyIndex++) {
        const propertyName = declaration.item(propertyIndex);
        if (propertyName.startsWith("--")) customPropertyNames.add(propertyName);
      }
    } else if (rule instanceof CSSGroupingRule) {
      collectNamesFromRules(rule.cssRules, customPropertyNames);
    }
  }
};

const EMPTY_RESOLVER: DesignTokenResolver = {
  hasTokens: false,
  matchColor: () => null,
  matchLength: () => null,
  stepLength: () => null,
};

export const collectDesignTokens = (element: Element): DesignTokenResolver => {
  if (typeof document === "undefined") return EMPTY_RESOLVER;

  const customPropertyNames = collectCustomPropertyNames();
  if (customPropertyNames.size === 0) return EMPTY_RESOLVER;

  const computedStyle = getComputedStyle(element);
  const colorNameByHex = new Map<string, string>();
  const lengthTokensByPx = new Map<number, LengthToken[]>();
  const lengthPxByFamily = new Map<TokenFamily, Set<number>>();
  // Tailwind derives every spacing/sizing step from one `--spacing` base unit
  // instead of emitting a discrete scale, so capture it for nextValueOnGrid.
  let spacingBaseUnitPx: number | null = null;

  for (const tokenName of customPropertyNames) {
    const rawValue = computedStyle.getPropertyValue(tokenName).trim();
    if (!rawValue) continue;

    const lengthPx = lengthValueToPx(rawValue);
    if (lengthPx !== null) {
      if (tokenName === "--spacing" && lengthPx > 0) spacingBaseUnitPx = lengthPx;
      const family = familyForTokenName(tokenName);
      if (family !== null) {
        const tokensAtPx = lengthTokensByPx.get(lengthPx);
        if (tokensAtPx) tokensAtPx.push({ name: tokenName, family });
        else lengthTokensByPx.set(lengthPx, [{ name: tokenName, family }]);
        const familyValues = lengthPxByFamily.get(family);
        if (familyValues) familyValues.add(lengthPx);
        else lengthPxByFamily.set(family, new Set([lengthPx]));
      }
      continue;
    }

    const colorHex = parseAnyColor(rawValue);
    if (colorHex) {
      const normalizedHex = colorHex.toLowerCase();
      const incumbent = colorNameByHex.get(normalizedHex) ?? null;
      if (preferToken(tokenName, incumbent)) colorNameByHex.set(normalizedHex, tokenName);
    }
  }

  if (colorNameByHex.size === 0 && lengthTokensByPx.size === 0) return EMPTY_RESOLVER;

  const sortedLengthPxByFamily = new Map<TokenFamily, number[]>();
  for (const [family, values] of lengthPxByFamily) {
    sortedLengthPxByFamily.set(
      family,
      Array.from(values).sort((left, right) => left - right),
    );
  }

  const matchColor = (hex: string): string | null => {
    const normalizedHex = parseAnyColor(hex)?.toLowerCase();
    return normalizedHex ? (colorNameByHex.get(normalizedHex) ?? null) : null;
  };

  const stepLength = (px: number, direction: 1 | -1, cssProperty: string): number | null => {
    const family = familyForCssProperty(cssProperty);
    if (family === null) return null;
    const current = Math.round(px);

    const scale = sortedLengthPxByFamily.get(family);
    // A real multi-step scale always wins.
    if (scale && scale.length >= 2) return nextValueInScale(scale, current, direction);
    // Spacing/sizing without a discrete scale ride Tailwind's `--spacing` grid.
    if ((family === "spacing" || family === "size") && spacingBaseUnitPx) {
      return nextValueOnGrid(current, direction, spacingBaseUnitPx);
    }
    // A lone token (e.g. a single `--radius`) can still be reached from nearby
    // values rather than dead-ending on a raw step.
    if (scale) return nextValueInScale(scale, current, direction);
    return null;
  };

  const matchLength = (px: number, cssProperty: string): string | null => {
    const family = familyForCssProperty(cssProperty);
    if (family === null) return null;
    const tokensAtPx = lengthTokensByPx.get(Math.round(px));
    if (!tokensAtPx) return null;
    // A purely numeric value (16px) collides across unrelated scales
    // (font-size, spacing, radius), so only a token in the same family is a
    // trustworthy match.
    let bestTokenName: string | null = null;
    for (const token of tokensAtPx) {
      if (token.family !== family) continue;
      if (preferToken(token.name, bestTokenName)) bestTokenName = token.name;
    }
    return bestTokenName;
  };

  return { hasTokens: true, matchColor, matchLength, stepLength };
};
