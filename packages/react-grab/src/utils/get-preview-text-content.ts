import { PREVIEW_TEXT_TAGS } from "../constants.js";

export interface PreviewTextContent {
  text: string;
  source: "direct" | "descendant" | null;
}

const SKIPPED_TEXT_TAGS = new Set(["script", "style", "template", "noscript"]);

const collapseTextContent = (text: string): string => text.replace(/\s+/g, " ").trim();

const getDirectTextContent = (element: Element): string => {
  let directText = "";
  for (const node of element.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE) continue;

    const trimmed = collapseTextContent(node.textContent ?? "");
    if (trimmed) {
      directText += (directText ? " " : "") + trimmed;
    }
  }
  return directText;
};

const shouldSkipElementText = (element: Element): boolean => {
  if (element.getAttribute("aria-hidden") === "true") return true;
  if (element.hasAttribute("hidden")) return true;
  return SKIPPED_TEXT_TAGS.has(element.tagName.toLowerCase());
};

const collectDescendantText = (node: Node, parts: string[]): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    const trimmed = collapseTextContent(node.textContent ?? "");
    if (trimmed) parts.push(trimmed);
    return;
  }

  if (!(node instanceof Element)) return;
  if (shouldSkipElementText(node)) return;

  for (const childNode of node.childNodes) {
    collectDescendantText(childNode, parts);
  }
};

export const getPreviewTextContentResult = (
  element: Element,
  tagName: string,
): PreviewTextContent => {
  if (shouldSkipElementText(element)) return { text: "", source: null };

  const directText = getDirectTextContent(element);
  if (directText) return { text: directText, source: "direct" };
  if (!PREVIEW_TEXT_TAGS.has(tagName)) return { text: "", source: null };

  const parts: string[] = [];
  for (const childNode of element.childNodes) {
    collectDescendantText(childNode, parts);
  }
  const descendantText = collapseTextContent(parts.join(" "));
  return {
    text: descendantText,
    source: descendantText ? "descendant" : null,
  };
};

export const getPreviewTextContent = (element: Element, tagName: string): string =>
  getPreviewTextContentResult(element, tagName).text;
