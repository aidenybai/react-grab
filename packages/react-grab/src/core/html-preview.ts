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
import { isElementNode } from "../utils/is-element-node.js";
import { isHtmlElement } from "../utils/is-html-element.js";
import { getElementAdapter } from "../utils/element-adapter.js";

const truncateAttrValue = (attributeValue: string): string =>
  truncateString(attributeValue, PREVIEW_ATTR_VALUE_MAX_LENGTH);

const formatPriorityAttrs = (element: Element): string => {
  const priorityAttrs: string[] = [];

  for (const attributeName of PREVIEW_PRIORITY_ATTRS) {
    const attributeValue = element.getAttribute(attributeName);
    if (attributeValue) priorityAttrs.push(`${attributeName}="${attributeValue}"`);
  }

  return priorityAttrs.length > 0 ? ` ${priorityAttrs.join(" ")}` : "";
};

const isClassOrStyleAttr = (attributeName: string): boolean =>
  attributeName === "class" || attributeName === "className" || attributeName === "style";

const formatAttrsForPreview = (element: Element): string => {
  const identifyingParts: string[] = [];
  const remainingParts: string[] = [];
  let classAttr = "";

  for (const { name: attributeName, value: attributeValue } of element.attributes) {
    if (isInternalAttribute(attributeName)) continue;
    if (isClassOrStyleAttr(attributeName)) {
      if (attributeName !== "style" && attributeValue) {
        classAttr = ` class="${truncateAttrValue(attributeValue)}"`;
      }
      continue;
    }
    if (PREVIEW_IDENTIFYING_ATTRS.has(attributeName)) {
      identifyingParts.push(
        attributeValue ? ` ${attributeName}="${attributeValue}"` : ` ${attributeName}`,
      );
    } else if (attributeValue) {
      remainingParts.push(` ${attributeName}="${truncateAttrValue(attributeValue)}"`);
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
  const adapter = getElementAdapter(element);
  if (adapter) return adapter.getPreview();
  const tagName = getTagName(element);

  if (!isHtmlElement(element)) {
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
  const adapter = getElementAdapter(element);
  if (adapter) return adapter.getPreview();
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
    } else if (isElementNode(node)) {
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
