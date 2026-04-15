import { escapeHtml } from "./escape-html.js";
import { stylesToInlineString } from "./snapshot-style-diff.js";

const FIRST_GRAPHEME_PATTERN = /^([^\p{L}\p{N}\s]*[\p{L}\p{N}](?:[''\u2019])?)/u;

const hasFirstLetterMeaningfulStyles = (
  firstLetterStyle: CSSStyleDeclaration,
  normalStyle: CSSStyleDeclaration,
): boolean => {
  const propertiesToCompare = [
    "color", "fontSize", "fontWeight", "fontFamily", "fontStyle",
    "textTransform", "float",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "marginTop", "marginRight", "marginBottom", "marginLeft",
  ];

  for (const property of propertiesToCompare) {
    if (firstLetterStyle.getPropertyValue(property) !== normalStyle.getPropertyValue(property)) {
      return true;
    }
  }

  return false;
};

export const materializeFirstLetter = (
  sourceElement: Element,
  childFragments: string[],
): void => {
  try {
    const firstLetterStyle = getComputedStyle(sourceElement, "::first-letter");
    const normalStyle = getComputedStyle(sourceElement);

    if (!hasFirstLetterMeaningfulStyles(firstLetterStyle, normalStyle)) return;

    const firstTextFragment = childFragments.find((fragment) => {
      const stripped = fragment.replace(/<[^>]*>/g, "").trim();
      return stripped.length > 0;
    });
    if (!firstTextFragment) return;

    const textOnly = firstTextFragment.replace(/<[^>]*>/g, "");
    const graphemeMatch = textOnly.match(FIRST_GRAPHEME_PATTERN);
    if (!graphemeMatch) return;

    const firstGrapheme = graphemeMatch[0];
    if (/[\uD800-\uDFFF]/.test(firstGrapheme)) return;

    const remainingText = textOnly.slice(firstGrapheme.length);

    const styles: Record<string, string> = {};
    for (let index = 0; index < firstLetterStyle.length; index++) {
      const propertyName = firstLetterStyle[index];
      if (propertyName.startsWith("--")) continue;
      const firstLetterValue = firstLetterStyle.getPropertyValue(propertyName);
      const normalValue = normalStyle.getPropertyValue(propertyName);
      if (firstLetterValue !== normalValue) {
        styles[propertyName] = firstLetterValue;
      }
    }

    if (Object.keys(styles).length === 0) return;

    const fragmentIndex = childFragments.indexOf(firstTextFragment);
    if (fragmentIndex === -1) return;

    const firstLetterSpan = `<span style="${stylesToInlineString(styles)}">${escapeHtml(firstGrapheme)}</span>`;
    childFragments[fragmentIndex] = firstLetterSpan + escapeHtml(remainingText);
  } catch {
    return;
  }
};
