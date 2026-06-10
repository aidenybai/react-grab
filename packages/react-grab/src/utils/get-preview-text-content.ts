import {
  PREVIEW_DESCENDANT_TEXT_TAGS,
  PREVIEW_SKIPPED_TEXT_TAGS,
  PREVIEW_TEXT_MAX_LENGTH,
} from "../constants.js";

const collapseTextContent = (text: string): string => text.replace(/\s+/g, " ").trim();

const getDirectTextContent = (element: Element): string => {
  const textParts: string[] = [];
  for (const node of element.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const collapsedText = collapseTextContent(node.textContent ?? "");
    if (collapsedText) textParts.push(collapsedText);
  }
  return textParts.join(" ");
};

const shouldSkipElementText = (element: Element): boolean => {
  if (element.getAttribute("aria-hidden") === "true") return true;
  if (element.hasAttribute("hidden")) return true;
  return PREVIEW_SKIPPED_TEXT_TAGS.has(element.tagName.toLowerCase());
};

// Returns the remaining character budget so the walk can stop once it has
// collected enough to fill PREVIEW_TEXT_MAX_LENGTH, instead of serializing an
// entire (potentially huge) syntax-highlighted subtree only to truncate it.
const collectDescendantText = (
  node: Node,
  textParts: string[],
  remainingCharacterBudget: number,
): number => {
  if (node.nodeType === Node.TEXT_NODE) {
    const collapsedText = collapseTextContent(node.textContent ?? "");
    if (!collapsedText) return remainingCharacterBudget;
    textParts.push(collapsedText);
    return remainingCharacterBudget - collapsedText.length;
  }

  if (!(node instanceof Element) || shouldSkipElementText(node)) return remainingCharacterBudget;

  for (const childNode of node.childNodes) {
    remainingCharacterBudget = collectDescendantText(
      childNode,
      textParts,
      remainingCharacterBudget,
    );
    if (remainingCharacterBudget <= 0) break;
  }
  return remainingCharacterBudget;
};

export const getPreviewTextContent = (element: Element, tagName: string): string => {
  if (shouldSkipElementText(element)) return "";

  const directText = getDirectTextContent(element);
  if (!PREVIEW_DESCENDANT_TEXT_TAGS.has(tagName)) return directText;
  if (directText && element.children.length === 0) return directText;

  const textParts: string[] = [];
  collectDescendantText(element, textParts, PREVIEW_TEXT_MAX_LENGTH);
  return textParts.join(" ");
};
