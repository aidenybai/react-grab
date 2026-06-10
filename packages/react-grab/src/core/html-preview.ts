import {
  PREVIEW_TEXT_MAX_LENGTH,
  PREVIEW_ATTR_VALUE_MAX_LENGTH,
  PREVIEW_PRIORITY_ATTRS,
  PREVIEW_IDENTIFYING_ATTRS,
  PREVIEW_DESCENDANT_TEXT_TAGS,
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";
import { isInternalAttribute } from "../utils/strip-internal-attributes.js";
import { getPreviewTextContent } from "../utils/get-preview-text-content.js";

const truncateAttrValue = (value: string): string =>
  truncateString(value, PREVIEW_ATTR_VALUE_MAX_LENGTH);

const formatPriorityAttrs = (element: Element): string => {
  const priorityAttrs: string[] = [];

  for (const name of PREVIEW_PRIORITY_ATTRS) {
    const value = element.getAttribute(name);
    if (value) priorityAttrs.push(`${name}="${value}"`);
  }

  return priorityAttrs.length > 0 ? ` ${priorityAttrs.join(" ")}` : "";
};

const isClassOrStyleAttr = (name: string): boolean =>
  name === "class" || name === "className" || name === "style";

const formatAttrsForPreview = (element: Element): string => {
  const identifyingParts: string[] = [];
  const remainingParts: string[] = [];
  let classAttr = "";

  for (const { name, value } of element.attributes) {
    if (isInternalAttribute(name)) continue;
    if (isClassOrStyleAttr(name)) {
      if (name !== "style" && value) {
        classAttr = ` class="${truncateAttrValue(value)}"`;
      }
      continue;
    }
    if (PREVIEW_IDENTIFYING_ATTRS.has(name)) {
      identifyingParts.push(value ? ` ${name}="${value}"` : ` ${name}`);
    } else if (value) {
      remainingParts.push(` ${name}="${truncateAttrValue(value)}"`);
    }
  }

  return identifyingParts.join("") + remainingParts.join("") + classAttr;
};

const formatChildElements = (elements: Array<Element>): string => {
  if (elements.length === 0) return "";
  if (elements.length <= 2) {
    return elements.map((childElement) => `<${getTagName(childElement)} ...>`).join("\n  ");
  }
  return `(${elements.length} elements)`;
};

export const getInlineHTMLPreview = (element: Element): string => {
  const tagName = getTagName(element);

  if (!(element instanceof HTMLElement)) {
    return `<${tagName}${formatPriorityAttrs(element)} />`;
  }

  const attrsText = formatAttrsForPreview(element);
  const previewText = getPreviewTextContent(element, tagName);
  const truncatedText = truncateString(previewText, PREVIEW_TEXT_MAX_LENGTH);

  if (truncatedText) {
    return `<${tagName}${attrsText}>${truncatedText}</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};

export const getHTMLPreview = (element: Element): string => {
  const tagName = getTagName(element);
  const attrsText = formatAttrsForPreview(element);
  const previewText = getPreviewTextContent(element, tagName);

  const topElements: Array<Element> = [];
  const bottomElements: Array<Element> = [];
  let foundFirstText = false;

  for (const node of element.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent && node.textContent.trim().length > 0) {
        foundFirstText = true;
      }
    } else if (node instanceof Element) {
      if (!foundFirstText) {
        topElements.push(node);
      } else {
        bottomElements.push(node);
      }
    }
  }

  const previewSubsumesChildren =
    previewText.length > 0 && PREVIEW_DESCENDANT_TEXT_TAGS.has(tagName);

  let content = "";
  const topElementsStr = formatChildElements(topElements);
  if (topElementsStr && !previewSubsumesChildren) content += `\n  ${topElementsStr}`;
  if (previewText) {
    content += `\n  ${truncateString(previewText, PREVIEW_TEXT_MAX_LENGTH)}`;
  }
  const bottomElementsStr = formatChildElements(bottomElements);
  if (bottomElementsStr && !previewSubsumesChildren) content += `\n  ${bottomElementsStr}`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
