import { EDIT_TRANSPARENT_COLOR_HEX } from "../constants.js";
import { TAILWIND_PALETTE } from "./tailwind-palette-data.js";

const TAILWIND_PREFIX_TO_PROPERTY: Partial<Record<string, string>> = {
  p: "padding",
  px: "padding-left,padding-right",
  py: "padding-top,padding-bottom",
  pt: "padding-top",
  pr: "padding-right",
  pb: "padding-bottom",
  pl: "padding-left",
  ps: "padding-left",
  pe: "padding-right",
  m: "margin",
  mx: "margin-left,margin-right",
  my: "margin-top,margin-bottom",
  mt: "margin-top",
  mr: "margin-right",
  mb: "margin-bottom",
  ml: "margin-left",
  ms: "margin-left",
  me: "margin-right",
  gap: "gap",
  "gap-x": "column-gap",
  "gap-y": "row-gap",
  text: "font-size",
  leading: "line-height",
  tracking: "letter-spacing",
  rounded: "border-radius",
  "rounded-t": "border-top-left-radius,border-top-right-radius",
  "rounded-b": "border-bottom-left-radius,border-bottom-right-radius",
  "rounded-l": "border-top-left-radius,border-bottom-left-radius",
  "rounded-r": "border-top-right-radius,border-bottom-right-radius",
  "rounded-tl": "border-top-left-radius",
  "rounded-tr": "border-top-right-radius",
  "rounded-bl": "border-bottom-left-radius",
  "rounded-br": "border-bottom-right-radius",
  border: "border-width",
  "border-t": "border-top-width",
  "border-r": "border-right-width",
  "border-b": "border-bottom-width",
  "border-l": "border-left-width",
  w: "width",
  h: "height",
  // `size-N` is the common tailwind utility for square SVG / avatar /
  // icon sizing — sets both width and height. The auto-apply fan-out
  // path already handles comma-joined targets (split + write through
  // each longhand), and width + height are tracked individually in
  // initialProperties, so this entry alone makes `size-4` work.
  size: "width,height",
  "max-w": "max-width",
  "max-h": "max-height",
  "min-w": "min-width",
  "min-h": "min-height",
  opacity: "opacity",
  inset: "top,right,bottom,left",
  "inset-x": "left,right",
  "inset-y": "top,bottom",
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
  z: "z-index",
  // Flex alignment enums. `items-center` / `justify-between` etc. land
  // here as numeric-pattern misses (no `-N` suffix) but the alias
  // ranking still uses these so search picks the right row.
  items: "align-items",
  justify: "justify-content",
  // `font-N` maps to numeric font-weight (e.g. `font-700` → 700).
  // Named utilities like `font-bold` resolve to "bold" tail which
  // doesn't match the numeric value regex; users cycle the row
  // instead.
  font: "font-weight",
  whitespace: "white-space",
};

const EXTRA_PROPERTY_ALIASES: Record<string, string[]> = {
  // Spelled-out nouns for natural-language comparatives ("more padding",
  // "less line height"). Tailwind prefixes (p, m, w, …) are already folded in
  // below; these add the words users actually type.
  padding: ["padding", "pad"],
  margin: ["margin"],
  gap: ["gap", "gutter"],
  width: ["width"],
  height: ["height"],
  "border-radius": ["radius", "border radius", "rounding", "roundness", "corners"],
  "border-width": ["border", "border width", "border thickness"],
  "letter-spacing": ["letter spacing", "tracking"],
  "line-height": ["line height", "leading"],
  "z-index": ["z index", "depth"],
  "font-weight": ["weight", "font weight", "boldness"],
  opacity: ["opacity"],
  "font-size": ["font-size", "font size", "text-size", "text size"],
  color: ["color", "text-color", "text color", "text-colour", "text colour", "foreground", "fg"],
  "background-color": [
    "background",
    "background-color",
    "background color",
    "bg",
    "bg-color",
    "bg color",
  ],
  "border-color": ["border-color", "border color"],
  fill: ["fill", "fill-color", "fill color"],
  stroke: ["stroke", "stroke-color", "stroke color"],
  "font-family": [
    "font",
    "font-sans",
    "font-serif",
    "font-mono",
    "family",
    "sans",
    "serif",
    "mono",
  ],
  "font-style": ["italic", "not-italic"],
  "text-align": ["text-left", "text-center", "text-right", "text-justify"],
  "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
  "text-decoration-line": ["underline", "line-through", "no-underline"],
  "white-space": ["whitespace", "whitespace-normal", "whitespace-nowrap", "whitespace-pre"],
  "word-break": ["break-normal", "break-all", "break-keep"],
  "overflow-wrap": ["break-words", "break-anywhere"],
  "font-variant-numeric": ["tabular-nums", "proportional-nums", "lining-nums", "oldstyle-nums"],
  "border-style": ["border-solid", "border-dashed", "border-dotted", "border-none"],
};

const PROPERTY_ALIASES = ((): Partial<Record<string, string[]>> => {
  const prefixSetsByProperty: Partial<Record<string, Set<string>>> = {};
  for (const [prefix, property] of Object.entries(TAILWIND_PREFIX_TO_PROPERTY)) {
    if (property === undefined) continue;
    (prefixSetsByProperty[property] ??= new Set()).add(prefix);
  }
  const aliasesByProperty: Partial<Record<string, string[]>> = {};
  for (const [property, prefixes] of Object.entries(prefixSetsByProperty)) {
    if (prefixes === undefined) continue;
    aliasesByProperty[property] = Array.from(prefixes);
  }
  for (const [property, aliases] of Object.entries(EXTRA_PROPERTY_ALIASES)) {
    const merged = new Set([...(aliasesByProperty[property] ?? []), ...aliases]);
    aliasesByProperty[property] = Array.from(merged);
  }
  return aliasesByProperty;
})();

const TAILWIND_COLOR_PREFIX_TO_PROPERTY: Partial<Record<string, string>> = {
  text: "color",
  bg: "background-color",
  border: "border-color",
  "border-x": "border-color",
  "border-y": "border-color",
  "border-t": "border-color",
  "border-r": "border-color",
  "border-b": "border-color",
  "border-l": "border-color",
  "border-s": "border-color",
  "border-e": "border-color",
  fill: "fill",
  stroke: "stroke",
};

const isKnownTailwindPrefix = (prefix: string): boolean =>
  TAILWIND_PREFIX_TO_PROPERTY[prefix] !== undefined ||
  TAILWIND_COLOR_PREFIX_TO_PROPERTY[prefix] !== undefined;

const stripTailwindModifiers = (className: string): string => {
  let bracketDepth = 0;
  let lastVariantColon = -1;
  for (let characterIndex = 0; characterIndex < className.length; characterIndex++) {
    const character = className[characterIndex];
    if (character === "[") bracketDepth++;
    else if (character === "]") bracketDepth--;
    else if (character === ":" && bracketDepth === 0) lastVariantColon = characterIndex;
  }
  const baseClassName = lastVariantColon >= 0 ? className.slice(lastVariantColon + 1) : className;
  return baseClassName.startsWith("!") ? baseClassName.slice(1) : baseClassName;
};

const matchTailwindPrefix = (rawClassName: string): string | null => {
  const baseClassName = stripTailwindModifiers(rawClassName);
  if (!baseClassName) return null;

  const bracketIndex = baseClassName.indexOf("[");
  if (bracketIndex > 0) {
    const prefixStem = baseClassName.slice(0, bracketIndex).replace(/-$/, "");
    return prefixStem || null;
  }

  const segments = baseClassName.split("-").filter(Boolean);
  if (segments.length === 0) return null;

  for (let prefixLength = segments.length; prefixLength >= 1; prefixLength--) {
    const prefixCandidate = segments.slice(0, prefixLength).join("-");
    if (isKnownTailwindPrefix(prefixCandidate)) return prefixCandidate;
  }

  return segments[0];
};

const AMBIGUOUS_COLOR_CLASS_TAIL_REGEX =
  /-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white|transparent|current|inherit)\b/;

const isAmbiguousColorClass = (prefix: string, token: string): boolean => {
  if (
    prefix !== "text" &&
    prefix !== "bg" &&
    prefix !== "border" &&
    !prefix.startsWith("border-")
  ) {
    return false;
  }
  return AMBIGUOUS_COLOR_CLASS_TAIL_REGEX.test(token);
};

const TAILWIND_COLOR_TOKENS = new Set([
  "color",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "grey",
  "zinc",
  "neutral",
  "stone",
  "black",
  "white",
  "transparent",
  "current",
  "currentcolor",
  "inherit",
  "primary",
  "secondary",
  "accent",
  "muted",
  "foreground",
  "background",
  "destructive",
  "success",
  "warning",
  "error",
  "info",
  "card",
  "popover",
  "input",
  "ring",
]);

const TAILWIND_TEXT_SIZE_TOKENS = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
]);

const CSS_COLOR_ARBITRARY_PATTERN =
  /^(#|rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color:|color\(|var\(--.*color)/;

const CSS_LENGTH_ARBITRARY_PATTERN = /^(-?\d|length:|size:)/;

export const normalizeTailwindClassInput = (query: string): string =>
  query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/([a-z])(\d)/g, "$1-$2");

const isTailwindArbitraryColor = (value: string): boolean =>
  CSS_COLOR_ARBITRARY_PATTERN.test(value) && !CSS_LENGTH_ARBITRARY_PATTERN.test(value);

const getTailwindClassTail = (baseClassName: string, prefix: string): string | null => {
  if (baseClassName === prefix) return "";
  const prefixWithSeparator = `${prefix}-`;
  if (!baseClassName.startsWith(prefixWithSeparator)) return null;
  return baseClassName.slice(prefixWithSeparator.length);
};

export const getTailwindColorPropertyForClassName = (className: string): string | null => {
  const baseClassName = stripTailwindModifiers(normalizeTailwindClassInput(className));
  const prefix = matchTailwindPrefix(baseClassName);
  if (!prefix) return null;
  const propertyKey = TAILWIND_COLOR_PREFIX_TO_PROPERTY[prefix];
  if (!propertyKey) return null;

  const bracketIndex = baseClassName.indexOf("[");
  if (bracketIndex >= 0) {
    const arbitraryValue = baseClassName.slice(bracketIndex + 1).replace(/\]$/, "");
    return isTailwindArbitraryColor(arbitraryValue) ? propertyKey : null;
  }

  const tail = getTailwindClassTail(baseClassName, prefix);
  if (tail === null) return null;
  if (prefix === "bg" && tail === "") return propertyKey;
  if ((prefix === "fill" || prefix === "stroke") && tail === "") return propertyKey;
  const colorToken = tail.split("-")[0];
  if (prefix === "text" && TAILWIND_TEXT_SIZE_TOKENS.has(colorToken)) return null;
  return TAILWIND_COLOR_TOKENS.has(colorToken) ? propertyKey : null;
};

const TAILWIND_KEYWORD_COLOR_HEX: Partial<Record<string, string>> = {
  black: "#000000",
  white: "#ffffff",
  transparent: EDIT_TRANSPARENT_COLOR_HEX,
};

// Returns null for arbitrary values, theme tokens (primary/accent/…), the
// `current`/`inherit` keywords, and prefix-only classes (`bg`) — none of
// which map to a fixed palette hex.
export const getTailwindNamedColorHex = (className: string): string | null => {
  const baseClassName = stripTailwindModifiers(normalizeTailwindClassInput(className));
  const prefix = matchTailwindPrefix(baseClassName);
  if (!prefix || TAILWIND_COLOR_PREFIX_TO_PROPERTY[prefix] === undefined) return null;
  if (baseClassName.includes("[")) return null;

  const tail = getTailwindClassTail(baseClassName, prefix);
  if (!tail) return null;

  const keywordHex = TAILWIND_KEYWORD_COLOR_HEX[tail];
  if (keywordHex) return keywordHex;

  const shadeSeparatorIndex = tail.lastIndexOf("-");
  if (shadeSeparatorIndex < 0) return null;
  const familyToken = tail.slice(0, shadeSeparatorIndex);
  const family = familyToken === "grey" ? "gray" : familyToken;
  const shade = Number.parseInt(tail.slice(shadeSeparatorIndex + 1), 10);
  return TAILWIND_PALETTE[family]?.[shade] ?? null;
};

const NUMERIC_TAILWIND_VALUE_PATTERN = /^-?\d/;

const isTailwindPrefixFallbackValue = (prefix: string, tail: string): boolean => {
  if (tail === "") return true;
  if (tail.startsWith("[") || NUMERIC_TAILWIND_VALUE_PATTERN.test(tail)) return true;
  const valueToken = tail.split("-")[0];
  if (prefix === "text") return TAILWIND_TEXT_SIZE_TOKENS.has(valueToken);
  if (prefix === "font") return false;
  if (prefix === "border" || prefix.startsWith("border-")) return false;
  if (prefix === "rounded" || prefix.startsWith("rounded-")) return true;
  if (prefix === "leading" || prefix === "tracking") return true;
  if (prefix === "items" || prefix === "justify") return true;
  return true;
};

interface TailwindEnumValueMapping {
  property: string;
  value: string;
}

const TAILWIND_CLASS_TO_ENUM_VALUE: Partial<Record<string, TailwindEnumValueMapping>> = {
  "font-sans": {
    property: "font-family",
    value:
      'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  },
  "font-serif": {
    property: "font-family",
    value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  "font-mono": {
    property: "font-family",
    value:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  "font-thin": { property: "font-weight", value: "100" },
  "font-extralight": { property: "font-weight", value: "200" },
  "font-light": { property: "font-weight", value: "300" },
  "font-normal": { property: "font-weight", value: "400" },
  "font-medium": { property: "font-weight", value: "500" },
  "font-semibold": { property: "font-weight", value: "600" },
  "font-bold": { property: "font-weight", value: "700" },
  "font-extrabold": { property: "font-weight", value: "800" },
  "font-black": { property: "font-weight", value: "900" },
  "text-left": { property: "text-align", value: "left" },
  "text-center": { property: "text-align", value: "center" },
  "text-right": { property: "text-align", value: "right" },
  "text-justify": { property: "text-align", value: "justify" },
  italic: { property: "font-style", value: "italic" },
  "not-italic": { property: "font-style", value: "normal" },
  uppercase: { property: "text-transform", value: "uppercase" },
  lowercase: { property: "text-transform", value: "lowercase" },
  capitalize: { property: "text-transform", value: "capitalize" },
  "normal-case": { property: "text-transform", value: "none" },
  underline: { property: "text-decoration-line", value: "underline" },
  "line-through": { property: "text-decoration-line", value: "line-through" },
  "no-underline": { property: "text-decoration-line", value: "none" },
  "whitespace-normal": { property: "white-space", value: "normal" },
  "whitespace-nowrap": { property: "white-space", value: "nowrap" },
  "whitespace-pre": { property: "white-space", value: "pre" },
  "whitespace-pre-line": { property: "white-space", value: "pre-line" },
  "whitespace-pre-wrap": { property: "white-space", value: "pre-wrap" },
  "whitespace-break-spaces": { property: "white-space", value: "break-spaces" },
  "break-normal": { property: "word-break", value: "normal" },
  "break-all": { property: "word-break", value: "break-all" },
  "break-keep": { property: "word-break", value: "keep-all" },
  "break-words": { property: "overflow-wrap", value: "break-word" },
  "break-anywhere": { property: "overflow-wrap", value: "anywhere" },
  "tabular-nums": { property: "font-variant-numeric", value: "tabular-nums" },
  "proportional-nums": { property: "font-variant-numeric", value: "proportional-nums" },
  "lining-nums": { property: "font-variant-numeric", value: "lining-nums" },
  "oldstyle-nums": { property: "font-variant-numeric", value: "oldstyle-nums" },
  "slashed-zero": { property: "font-variant-numeric", value: "slashed-zero" },
  "border-solid": { property: "border-style", value: "solid" },
  "border-dashed": { property: "border-style", value: "dashed" },
  "border-dotted": { property: "border-style", value: "dotted" },
  "border-none": { property: "border-style", value: "none" },
};

export const getTailwindPropertyKeysForSearchQuery = (query: string): string[] => {
  const normalizedQuery = normalizeTailwindClassInput(query);
  if (!normalizedQuery) return [];

  const enumMapping = tailwindClassToEnumValue(normalizedQuery);
  if (enumMapping) return [enumMapping.property];

  const colorPropertyKey = getTailwindColorPropertyForClassName(normalizedQuery);
  if (colorPropertyKey) return [colorPropertyKey];
  return [];
};

export const getTailwindPrefixPropertyKeysForSearchQuery = (query: string): string[] => {
  const normalizedQuery = normalizeTailwindClassInput(query);
  if (!normalizedQuery) return [];

  const prefix = matchTailwindPrefix(normalizedQuery);
  if (!prefix) return [];
  const tail = getTailwindClassTail(stripTailwindModifiers(normalizedQuery), prefix);
  if (tail === null || !isTailwindPrefixFallbackValue(prefix, tail)) return [];
  const prefixPropertyKey = tailwindPrefixToProperty(prefix);
  return prefixPropertyKey ? [prefixPropertyKey] : [];
};

export const getElementTailwindProperties = (element: Element): Set<string> => {
  const classAttribute = element.getAttribute("class");
  if (!classAttribute) return new Set();
  const tokens = classAttribute.split(/\s+/).filter(Boolean);
  const properties = new Set<string>();

  for (const token of tokens) {
    const prefix = matchTailwindPrefix(token);
    if (!prefix) continue;
    if (isAmbiguousColorClass(prefix, token)) continue;
    const enumMapping = tailwindClassToEnumValue(token);
    if (enumMapping) {
      properties.add(enumMapping.property);
      continue;
    }
    const mapped = tailwindPrefixToProperty(prefix);
    if (mapped) properties.add(mapped);
  }

  return properties;
};

export const getTailwindAliasesForProperty = (property: string): string[] =>
  PROPERTY_ALIASES[property] ?? [];

const normalizeAliasText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Reverse of PROPERTY_ALIASES: a spelled-out noun or tailwind prefix back to
// its css property key. First spelling wins on collision so prefix-derived
// keys (set up before EXTRA_PROPERTY_ALIASES) take precedence.
const PROPERTY_KEY_BY_ALIAS = ((): Map<string, string> => {
  const aliasToKey = new Map<string, string>();
  for (const [property, aliases] of Object.entries(PROPERTY_ALIASES)) {
    if (!aliases) continue;
    for (const alias of aliases) {
      const normalizedAlias = normalizeAliasText(alias);
      if (normalizedAlias && !aliasToKey.has(normalizedAlias)) {
        aliasToKey.set(normalizedAlias, property);
      }
    }
  }
  return aliasToKey;
})();

export const propertyKeyForAlias = (text: string): string | null => {
  const normalized = normalizeAliasText(text);
  if (!normalized) return null;
  return PROPERTY_KEY_BY_ALIAS.get(normalized) ?? null;
};

export const tailwindPrefixToProperty = (prefix: string): string | null => {
  const propertyKey = TAILWIND_PREFIX_TO_PROPERTY[prefix];
  return propertyKey === undefined ? null : propertyKey;
};

export const tailwindClassToEnumValue = (className: string): TailwindEnumValueMapping | null => {
  const enumMapping = TAILWIND_CLASS_TO_ENUM_VALUE[stripTailwindModifiers(className)];
  return enumMapping === undefined ? null : enumMapping;
};
