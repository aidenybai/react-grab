import { SNAPSHOT_INVISIBLE_TRANSFORMS } from "../../constants.js";
import { escapeHtml } from "./escape-html.js";
import { stylesToInlineString } from "./snapshot-style-diff.js";

const QUOTE_KEYWORD_MAP: Record<string, string> = {
  "open-quote": "\u201C",
  "close-quote": "\u201D",
  "no-open-quote": "",
  "no-close-quote": "",
};

const unquoteCssContentValue = (rawContent: string): string => {
  if (!rawContent) return "";

  const quoteReplacement = QUOTE_KEYWORD_MAP[rawContent];
  if (quoteReplacement !== undefined) return quoteReplacement;

  const unquoted = rawContent.match(/^["'](.*)["']$/);
  return unquoted ? unquoted[1] : "";
};

const isPseudoElementVisuallyHidden = (styles: Record<string, string>): boolean => {
  const hasInvisibleTransform = SNAPSHOT_INVISIBLE_TRANSFORMS.has(styles.transform || "");
  const isAbsoluteOrFixed =
    styles.position === "absolute" || styles.position === "fixed";
  return hasInvisibleTransform && isAbsoluteOrFixed;
};

export const materializePseudoElement = (
  element: Element,
  pseudoSelector: "::before" | "::after",
): string | null => {
  const pseudoComputed = getComputedStyle(element, pseudoSelector);
  const styles: Record<string, string> = {};

  for (let index = 0; index < pseudoComputed.length; index++) {
    const propertyName = pseudoComputed[index];
    if (propertyName.startsWith("--")) continue;

    const propertyValue = pseudoComputed.getPropertyValue(propertyName);
    if (propertyValue) {
      styles[propertyName] = propertyValue;
    }
  }

  if (!styles.content || Object.keys(styles).length === 0) return null;
  if (isPseudoElementVisuallyHidden(styles)) return null;

  const rawContent = styles.content;
  delete styles.content;
  delete styles["mask-image"];
  delete styles["-webkit-mask-image"];

  const urlMatch = rawContent.match(/^url\(\s*["']?([^"')]+)["']?\s*\)$/);
  if (urlMatch) {
    const imageUrl = urlMatch[1];
    const fontSize = styles["font-size"] || "16px";
    const imageStyle = `width:${fontSize};height:auto;object-fit:contain;`;
    return `<img src="${imageUrl}" style="${imageStyle}">`;
  }

  const textContent = unquoteCssContentValue(rawContent);
  const inlineStyle = stylesToInlineString(styles);
  return `<span style="${inlineStyle}">${escapeHtml(textContent)}</span>`;
};
