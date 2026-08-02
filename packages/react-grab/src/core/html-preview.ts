import {
  PREVIEW_TEXT_MAX_LENGTH,
  PREVIEW_ATTR_VALUE_MAX_LENGTH,
  PREVIEW_ATTRIBUTE_MAX_COUNT,
  PREVIEW_IDENTIFYING_ATTR_VALUE_MAX_LENGTH_CHARS,
  PREVIEW_PRIORITY_ATTRS,
  PREVIEW_IDENTIFYING_ATTRS,
  PREVIEW_DESCENDANT_TEXT_TAGS,
} from "../constants.js";
import { escapeHtmlAttribute } from "../utils/escape-html-attribute.js";
import { escapeHtmlText } from "../utils/escape-html-text.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateEscapedHtml } from "../utils/truncate-escaped-html.js";
import { isInternalAttribute } from "../utils/strip-internal-attributes.js";
import { getPreviewTextContent } from "../utils/get-preview-text-content.js";
import { isElementNode } from "../utils/is-element-node.js";
import { isHtmlElement } from "../utils/is-html-element.js";
import { getElementAdapter } from "./element-adapter.js";

const formatAttribute = (
  attributeName: string,
  attributeValue: string,
  maxLength: number,
): string =>
  `${attributeName}="${truncateEscapedHtml(escapeHtmlAttribute(attributeValue), maxLength)}"`;

const getFormattedPriorityAttrs = (element: Element): string[] => {
  const priorityAttrs: string[] = [];

  for (const attributeName of PREVIEW_PRIORITY_ATTRS) {
    if (priorityAttrs.length >= PREVIEW_ATTRIBUTE_MAX_COUNT) break;
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) continue;
    const maxLength =
      attributeName === "class"
        ? PREVIEW_ATTR_VALUE_MAX_LENGTH
        : PREVIEW_IDENTIFYING_ATTR_VALUE_MAX_LENGTH_CHARS;
    priorityAttrs.push(formatAttribute(attributeName, attributeValue, maxLength));
  }

  return priorityAttrs;
};

const formatPriorityAttrs = (element: Element): string => {
  const priorityAttrs = getFormattedPriorityAttrs(element);
  return priorityAttrs.length > 0 ? ` ${priorityAttrs.join(" ")}` : "";
};

const isClassOrStyleAttr = (attributeName: string): boolean =>
  attributeName === "class" || attributeName === "className" || attributeName === "style";

const formatAttrsForPreview = (element: Element): string => {
  const priorityParts = getFormattedPriorityAttrs(element).map(
    (formattedAttribute) => ` ${formattedAttribute}`,
  );
  const identifyingParts: string[] = [];
  const remainingParts: string[] = [];

  for (const { name: attributeName, value: attributeValue } of element.attributes) {
    if (isInternalAttribute(attributeName)) continue;
    if (PREVIEW_PRIORITY_ATTRS.includes(attributeName)) continue;
    if (isClassOrStyleAttr(attributeName)) continue;
    if (PREVIEW_IDENTIFYING_ATTRS.has(attributeName)) {
      identifyingParts.push(
        attributeValue
          ? ` ${formatAttribute(
              attributeName,
              attributeValue,
              PREVIEW_IDENTIFYING_ATTR_VALUE_MAX_LENGTH_CHARS,
            )}`
          : ` ${attributeName}`,
      );
    } else if (attributeValue) {
      remainingParts.push(
        ` ${formatAttribute(attributeName, attributeValue, PREVIEW_ATTR_VALUE_MAX_LENGTH)}`,
      );
    }
  }

  return [...priorityParts, ...identifyingParts, ...remainingParts]
    .slice(0, PREVIEW_ATTRIBUTE_MAX_COUNT)
    .join("");
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
    const attrsText = formatPriorityAttrs(element);
    const previewText = truncateEscapedHtml(
      escapeHtmlText(getPreviewTextContent(element, tagName)),
      PREVIEW_TEXT_MAX_LENGTH,
    );
    return previewText
      ? `<${tagName}${attrsText}>${previewText}</${tagName}>`
      : `<${tagName}${attrsText} />`;
  }

  const attrsText = formatAttrsForPreview(element);
  const previewText = getPreviewTextContent(element, tagName);
  const escapedPreviewText = truncateEscapedHtml(
    escapeHtmlText(previewText),
    PREVIEW_TEXT_MAX_LENGTH,
  );

  if (escapedPreviewText) {
    return `<${tagName}${attrsText}>${escapedPreviewText}</${tagName}>`;
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
    content += `\n  ${truncateEscapedHtml(escapeHtmlText(previewText), PREVIEW_TEXT_MAX_LENGTH)}`;
  }
  const bottomElementsStr = formatChildElements(bottomElements);
  if (bottomElementsStr && !previewSubsumesChildren) content += `\n  ${bottomElementsStr}`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
