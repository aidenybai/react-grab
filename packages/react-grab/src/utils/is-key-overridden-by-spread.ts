// React resolves a list item's `key` from JSX at runtime, so `fiber.key` is the
// final value regardless of how it was written - there is no runtime signal for
// whether a spread overrode it. To know if a surfaced key is trustworthy we
// have to look at the source: `<li key={id} {...props}>` lets `props.key`
// silently override `id` (and `<li {...props}>` sources the key entirely from
// the spread), so the value React reports won't match the `key={…}` an agent
// reads at that JSX site. A spread that sits *before* the key (`<li {...props}
// key={id}>`) can't override it, so that key stays reliable.
//
// This walks only the opening tag, tracking brace depth and string state so a
// `key`/`{...}` nested inside an attribute expression (e.g. `data-x={{ key: 1
// }}` or `title={spread(a)}`) never counts as a top-level attribute.

const isIdentifierChar = (character: string): boolean => /[A-Za-z0-9_$]/.test(character);

interface OpeningTagScan {
  hasExplicitKey: boolean;
  hasAnySpread: boolean;
  hasSpreadAfterKey: boolean;
}

const scanOpeningTag = (openingTag: string): OpeningTagScan => {
  let braceDepth = 0;
  let stringQuote: string | null = null;
  let keyIndex = -1;
  let hasAnySpread = false;
  let hasSpreadAfterKey = false;

  for (let index = 0; index < openingTag.length; index++) {
    const character = openingTag[index];

    if (stringQuote !== null) {
      if (character === stringQuote) stringQuote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      stringQuote = character;
      continue;
    }

    if (character === "{") {
      if (braceDepth === 0 && openingTag.slice(index + 1, index + 4) === "...") {
        hasAnySpread = true;
        if (keyIndex !== -1) hasSpreadAfterKey = true;
      }
      braceDepth++;
      continue;
    }

    if (character === "}") {
      if (braceDepth > 0) braceDepth--;
      continue;
    }

    if (braceDepth !== 0) continue;

    // A top-level `key` attribute name: `key` bounded by a non-identifier on the
    // left and an `=` (optionally spaced) on the right.
    if (
      keyIndex === -1 &&
      character === "k" &&
      openingTag.slice(index, index + 3) === "key" &&
      !isIdentifierChar(openingTag[index - 1] ?? " ") &&
      !isIdentifierChar(openingTag[index + 3] ?? " ")
    ) {
      const afterKey = openingTag.slice(index + 3).match(/^\s*=/);
      if (afterKey) keyIndex = index;
    }
  }

  return { hasExplicitKey: keyIndex !== -1, hasAnySpread, hasSpreadAfterKey };
};

// Returns the substring from the element's opening `<` to the `>` that closes
// the opening tag, or null when the tag can't be delimited (so callers keep the
// current behavior rather than acting on a half-parsed tag).
const extractOpeningTag = (source: string): string | null => {
  const tagStart = source.indexOf("<");
  if (tagStart === -1) return null;

  let braceDepth = 0;
  let stringQuote: string | null = null;

  for (let index = tagStart + 1; index < source.length; index++) {
    const character = source[index];

    if (stringQuote !== null) {
      if (character === stringQuote) stringQuote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      stringQuote = character;
      continue;
    }

    if (character === "{") {
      braceDepth++;
      continue;
    }

    if (character === "}") {
      if (braceDepth > 0) braceDepth--;
      continue;
    }

    if (braceDepth === 0 && character === ">") {
      return source.slice(tagStart, index + 1);
    }
  }

  return null;
};

// True when the `key` React resolved cannot be trusted to match the JSX `key={…}`
// at this site: a spread follows the key (so it may override it), or the key was
// sourced entirely from a spread (no explicit `key={…}`). A tag with no spread
// is always trusted, and an unparseable tag returns false, so an imperfect
// source read never suppresses a key that might be perfectly fine.
export const isKeyOverriddenBySpread = (elementSource: string): boolean => {
  const openingTag = extractOpeningTag(elementSource);
  if (openingTag === null) return false;

  const { hasExplicitKey, hasAnySpread, hasSpreadAfterKey } = scanOpeningTag(openingTag);
  if (!hasAnySpread) return false;
  if (!hasExplicitKey) return true;
  return hasSpreadAfterKey;
};
