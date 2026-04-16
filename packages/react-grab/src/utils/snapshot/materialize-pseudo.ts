import { SNAPSHOT_INVISIBLE_TRANSFORMS, SNAPSHOT_PSEUDO_VISUAL_PROPERTIES } from "../../constants.js";
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
  const contentValue = pseudoComputed.getPropertyValue("content");

  if (!contentValue || contentValue === "none" || contentValue === "normal") return null;

  const styles: Record<string, string> = {};
  for (const propertyName of SNAPSHOT_PSEUDO_VISUAL_PROPERTIES) {
    const propertyValue = pseudoComputed.getPropertyValue(propertyName);
    if (propertyValue) {
      styles[propertyName] = propertyValue;
    }
  }

  if (isPseudoElementVisuallyHidden(styles)) return null;

  const urlMatch = contentValue.match(/^url\(\s*["']?([^"')]+)["']?\s*\)$/);
  if (urlMatch) {
    const escapedImageUrl = escapeHtml(urlMatch[1]);
    const fontSize = styles["font-size"] || "16px";
    const imageStyle = `width:${fontSize};height:auto;object-fit:contain;`;
    return `<img src="${escapedImageUrl}" style="${imageStyle}"/>`;
  }

  const textContent = unquoteCssContentValue(contentValue);
  const inlineStyle = stylesToInlineString(styles);
  return `<span style="${inlineStyle}">${escapeHtml(textContent)}</span>`;
};
