const TAILWIND_PREFIX_TO_PROPERTY: Record<string, string> = {
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
  // Per-side utilities map to their proper longhand. Pointing them at
  // the aggregate "border-width" would set every side from a side-
  // specific class — a user typing `border-t-4` would also overwrite
  // right/bottom/left. Targets aren't currently tracked in
  // initialProperties, so auto-apply will no-op until they are (gated
  // below in tryApplyTailwindClass); the mapping just needs to point
  // at the right CSS key so search ranking still surfaces the right
  // intent.
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
  "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
  "text-decoration-line": ["underline", "line-through", "no-underline"],
  "white-space": ["whitespace", "whitespace-normal", "whitespace-nowrap", "whitespace-pre"],
  "word-break": ["break-normal", "break-all", "break-keep"],
  "overflow-wrap": ["break-words", "break-anywhere"],
  "font-variant-numeric": ["tabular-nums", "proportional-nums", "lining-nums", "oldstyle-nums"],
};

const PROPERTY_ALIASES = ((): Record<string, string[]> => {
  const prefixSetsByProperty: Record<string, Set<string>> = {};
  for (const [prefix, property] of Object.entries(TAILWIND_PREFIX_TO_PROPERTY)) {
    (prefixSetsByProperty[property] ??= new Set()).add(prefix);
  }
  const aliasesByProperty: Record<string, string[]> = {};
  for (const [property, prefixes] of Object.entries(prefixSetsByProperty)) {
    aliasesByProperty[property] = Array.from(prefixes);
  }
  for (const [property, aliases] of Object.entries(EXTRA_PROPERTY_ALIASES)) {
    const merged = new Set([...(aliasesByProperty[property] ?? []), ...aliases]);
    aliasesByProperty[property] = Array.from(merged);
  }
  return aliasesByProperty;
})();

// Bracket-aware variant separator: Tailwind arbitrary values like
// `bg-[url(http://x)]` contain colons inside `[…]`; only colons OUTSIDE
// any brackets are variant separators.
const stripTailwindModifiers = (className: string): string => {
  let bracketDepth = 0;
  let lastVariantColon = -1;
  for (let index = 0; index < className.length; index++) {
    const character = className[index];
    if (character === "[") bracketDepth++;
    else if (character === "]") bracketDepth--;
    else if (character === ":" && bracketDepth === 0) lastVariantColon = index;
  }
  const baseClassName = lastVariantColon >= 0 ? className.slice(lastVariantColon + 1) : className;
  return baseClassName.startsWith("!") ? baseClassName.slice(1) : baseClassName;
};

// Walks segment prefixes from longest to shortest until one matches a known
// Tailwind utility prefix. Without this, `text-blue-500` returns `text-blue`
// (greedy "strip trailing numeric"), which isn't in the prefix map even
// though `text` is — and would silently fail to map to `color`.
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
    if (TAILWIND_PREFIX_TO_PROPERTY[prefixCandidate]) return prefixCandidate;
  }

  return segments[0];
};

// Color-named tail tokens — used to detect when an otherwise-ambiguous
// class (e.g. text-blue-500, border-red-500) is operating on color and
// should NOT bubble unrelated rows (font-size, border-width) to the top
// of the editor. The editor doesn't expose color tweaking, so the
// safest behavior is to ignore the class entirely.
const COLOR_TAIL_REGEX =
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
  return COLOR_TAIL_REGEX.test(token);
};

const TAILWIND_CLASS_TO_ENUM_VALUE: Record<string, { property: string; value: string }> = {
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

export const tailwindAliasesForProperty = (property: string): string[] =>
  PROPERTY_ALIASES[property] ?? [];

export const tailwindPrefixToProperty = (prefix: string): string | null =>
  TAILWIND_PREFIX_TO_PROPERTY[prefix] ?? null;

export const tailwindClassToEnumValue = (
  className: string,
): { property: string; value: string } | null =>
  TAILWIND_CLASS_TO_ENUM_VALUE[stripTailwindModifiers(className)] ?? null;
