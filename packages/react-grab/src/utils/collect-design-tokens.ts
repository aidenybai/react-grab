import { EDIT_ROOT_FONT_SIZE_PX } from "../constants.js";
import type { DesignTokenResolver } from "../types.js";
import { parseAnyColor } from "./parse-any-color.js";

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
  families: ReadonlySet<TokenFamily>;
}

const LENGTH_VALUE_PATTERN = /^(-?\d*\.?\d+)(px|rem)$/i;

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

const familiesFromTokenName = (tokenName: string): Set<TokenFamily> => {
  const normalizedName = tokenName.toLowerCase();
  const families = new Set<TokenFamily>();
  for (const { keyword, family } of FAMILY_NAME_KEYWORDS) {
    if (normalizedName.includes(keyword)) families.add(family);
  }
  return families;
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
  const match = rawValue.trim().match(LENGTH_VALUE_PATTERN);
  if (!match) return null;
  const magnitude = Number.parseFloat(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  const px = match[2].toLowerCase() === "rem" ? magnitude * EDIT_ROOT_FONT_SIZE_PX : magnitude;
  return Math.round(px);
};

// A token reference is only useful if it is shorter / more semantic than
// the literal, so ties resolve to the shortest name (then alphabetically)
// for a deterministic, library-independent pick.
const preferToken = (candidate: string, incumbent: string | null): boolean => {
  if (incumbent === null) return true;
  if (candidate.length !== incumbent.length) return candidate.length < incumbent.length;
  return candidate < incumbent;
};

const collectCustomPropertyNames = (): Set<string> => {
  const names = new Set<string>();
  for (const styleSheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      // Cross-origin stylesheets throw on `.cssRules` access.
      rules = styleSheet.cssRules;
    } catch {
      continue;
    }
    collectNamesFromRules(rules, names);
  }
  return names;
};

const collectNamesFromRules = (rules: CSSRuleList, names: Set<string>) => {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const declaration = rule.style;
      for (let propertyIndex = 0; propertyIndex < declaration.length; propertyIndex++) {
        const propertyName = declaration.item(propertyIndex);
        if (propertyName.startsWith("--")) names.add(propertyName);
      }
    } else if (rule instanceof CSSGroupingRule) {
      collectNamesFromRules(rule.cssRules, names);
    }
  }
};

export const collectDesignTokens = (element: Element): DesignTokenResolver => {
  if (typeof document === "undefined") return EMPTY_RESOLVER;

  const customPropertyNames = collectCustomPropertyNames();
  if (customPropertyNames.size === 0) return EMPTY_RESOLVER;

  const computed = getComputedStyle(element);
  const colorNameByHex = new Map<string, string>();
  const lengthTokensByPx = new Map<number, LengthToken[]>();
  const lengthPxByFamily = new Map<TokenFamily, Set<number>>();
  // Tailwind exposes spacing (and sizing) as `calc(var(--spacing) * N)` rather
  // than discrete per-step tokens, so the single base unit is the scale.
  let spacingBaseUnitPx: number | null = null;

  for (const tokenName of customPropertyNames) {
    const rawValue = computed.getPropertyValue(tokenName).trim();
    if (!rawValue) continue;

    const lengthPx = lengthValueToPx(rawValue);
    if (lengthPx !== null) {
      if (tokenName === "--spacing" && lengthPx > 0) spacingBaseUnitPx = lengthPx;
      const families = familiesFromTokenName(tokenName);
      const tokens = lengthTokensByPx.get(lengthPx);
      const lengthToken: LengthToken = { name: tokenName, families };
      if (tokens) tokens.push(lengthToken);
      else lengthTokensByPx.set(lengthPx, [lengthToken]);
      for (const family of families) {
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

    // A discrete token scale (Radix/Chakra spacing, Tailwind `--text-*`, …)
    // wins when present: snap to its neighbours and defer off-scale values to
    // the raw step.
    const scale = sortedLengthPxByFamily.get(family);
    if (scale && scale.length >= 2) {
      // Above the largest token the user is fine-tuning past the scale.
      if (current > scale[scale.length - 1]) return null;
      if (direction === 1) {
        // The first token greater than current also pulls a below-scale value
        // (8px under a 16px floor) up onto the scale.
        for (const value of scale) {
          if (value > current) return value;
        }
        return null;
      }
      // Below the smallest token there is no lower token to snap down to.
      if (current <= scale[0]) return null;
      for (let scaleIndex = scale.length - 1; scaleIndex >= 0; scaleIndex--) {
        if (scale[scaleIndex] < current) return scale[scaleIndex];
      }
      return null;
    }

    // No discrete scale: walk Tailwind's spacing/sizing grid (multiples of the
    // `--spacing` base unit) so the arrows still move by the design system step.
    if ((family === "spacing" || family === "size") && spacingBaseUnitPx) {
      const gridIndex =
        direction === 1
          ? Math.floor(current / spacingBaseUnitPx) + 1
          : Math.ceil(current / spacingBaseUnitPx) - 1;
      const next = gridIndex * spacingBaseUnitPx;
      return next < 0 ? null : next;
    }
    return null;
  };

  const matchLength = (px: number, cssProperty: string): string | null => {
    const tokens = lengthTokensByPx.get(Math.round(px));
    if (!tokens) return null;
    const family = familyForCssProperty(cssProperty);
    let best: string | null = null;
    for (const token of tokens) {
      // A purely numeric value (16px) collides across unrelated scales
      // (font-size, spacing, radius), so only a token whose name signals
      // the same family is a trustworthy match.
      if (family === null || !token.families.has(family)) continue;
      if (preferToken(token.name, best)) best = token.name;
    }
    return best;
  };

  return { hasTokens: true, matchColor, matchLength, stepLength };
};

const EMPTY_RESOLVER: DesignTokenResolver = {
  hasTokens: false,
  matchColor: () => null,
  matchLength: () => null,
  stepLength: () => null,
};
