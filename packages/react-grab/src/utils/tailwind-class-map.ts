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
  "border-t": "border-width",
  "border-r": "border-width",
  "border-b": "border-width",
  "border-l": "border-width",
  w: "width",
  h: "height",
  "max-w": "max-width",
  "max-h": "max-height",
  "min-w": "min-width",
  "min-h": "min-height",
  opacity: "opacity",
};

const PROPERTY_ALIASES = ((): Record<string, string[]> => {
  const reverse: Record<string, Set<string>> = {};
  for (const [prefix, property] of Object.entries(TAILWIND_PREFIX_TO_PROPERTY)) {
    (reverse[property] ??= new Set()).add(prefix);
  }
  const out: Record<string, string[]> = {};
  for (const [property, prefixes] of Object.entries(reverse)) {
    out[property] = Array.from(prefixes);
  }
  return out;
})();

// Bracket-aware variant separator: Tailwind arbitrary values like
// `bg-[url(http://x)]` contain colons inside `[…]`; only colons OUTSIDE
// any brackets are variant separators.
const stripTailwindModifiers = (className: string): string => {
  let bracketDepth = 0;
  let lastVariantColon = -1;
  for (let index = 0; index < className.length; index++) {
    const char = className[index];
    if (char === "[") bracketDepth++;
    else if (char === "]") bracketDepth--;
    else if (char === ":" && bracketDepth === 0) lastVariantColon = index;
  }
  const base = lastVariantColon >= 0 ? className.slice(lastVariantColon + 1) : className;
  return base.startsWith("!") ? base.slice(1) : base;
};

// Walks segment prefixes from longest to shortest until one matches a known
// Tailwind utility prefix. Without this, `text-blue-500` returns `text-blue`
// (greedy "strip trailing numeric"), which isn't in the prefix map even
// though `text` is — and would silently fail to map to `color`.
export const matchTailwindPrefix = (rawClassName: string): string | null => {
  const base = stripTailwindModifiers(rawClassName);
  if (!base) return null;

  const bracketIndex = base.indexOf("[");
  if (bracketIndex > 0) {
    const stem = base.slice(0, bracketIndex).replace(/-$/, "");
    return stem || null;
  }

  const segments = base.split("-").filter(Boolean);
  if (segments.length === 0) return null;

  for (let length = segments.length; length >= 1; length--) {
    const candidate = segments.slice(0, length).join("-");
    if (TAILWIND_PREFIX_TO_PROPERTY[candidate]) return candidate;
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

export const getElementTailwindProperties = (element: Element): Set<string> => {
  const classAttribute = element.getAttribute("class");
  if (!classAttribute) return new Set();
  const tokens = classAttribute.split(/\s+/).filter(Boolean);
  const properties = new Set<string>();

  for (const token of tokens) {
    const prefix = matchTailwindPrefix(token);
    if (!prefix) continue;
    if (isAmbiguousColorClass(prefix, token)) continue;
    const mapped = tailwindPrefixToProperty(prefix);
    if (mapped) properties.add(mapped);
  }

  return properties;
};

export const tailwindAliasesForProperty = (property: string): string[] =>
  PROPERTY_ALIASES[property] ?? [];

export const tailwindPrefixToProperty = (prefix: string): string | null =>
  TAILWIND_PREFIX_TO_PROPERTY[prefix] ?? null;
