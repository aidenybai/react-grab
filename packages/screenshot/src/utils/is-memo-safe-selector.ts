// Selectors built only from tags, classes, ids, universal, descendant/child
// combinators, and paint-only pseudo-elements match identically for any two
// elements with the same tag/attribute/ancestor-key chain. Attribute
// selectors, sibling combinators, and state/structural pseudo-classes
// (:hover, :nth-child, :has, ...) can distinguish such elements, so their
// presence disables style-snapshot memoization.
const PAINT_ONLY_PSEUDO_PATTERN =
  /::?(?:before|after|first-letter|first-line|marker|selection|placeholder|backdrop|root|-webkit-[a-z-]+)\b/g;
const MEMO_UNSAFE_SELECTOR_CHAR_PATTERN = /[[+~:]/;

export const isMemoSafeSelector = (selectorText: string): boolean =>
  !MEMO_UNSAFE_SELECTOR_CHAR_PATTERN.test(selectorText.replace(PAINT_ONLY_PSEUDO_PATTERN, ""));
