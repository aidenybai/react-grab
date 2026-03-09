import {
  PREVIEW_TEXT_MAX_LENGTH,
  PREVIEW_ATTR_VALUE_MAX_LENGTH,
  PREVIEW_MAX_ATTRS,
  PREVIEW_PRIORITY_ATTRS,
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";
import { formatElementStack } from "../utils/format-element-stack.js";
import { mergeStackContext } from "../utils/merge-stack-context.js";
import {
  findNearestFiberElement,
  getReactStackContext,
} from "./source/react.js";
import { resolveElementStack } from "./source/index.js";

export {
  checkIsNextProject,
  checkIsSourceComponentName,
  findNearestFiberElement,
  getReactStack as getStack,
  getReactComponentName as getNearestComponentName,
  resolveSourceFromStack,
  getReactDisplayName as getComponentDisplayName,
  formatReactStackContext as formatStackContext,
  getReactStackContext as getStackContext,
} from "./source/react.js";

export const getElementContext = async (
  element: Element,
  options: { maxLines?: number } = {},
): Promise<string> => {
  const resolvedElement = findNearestFiberElement(element);
  const html = getHTMLPreview(resolvedElement);
  const { maxLines = 3 } = options;

  const reactStackContext = await getReactStackContext(resolvedElement, {
    maxLines,
  });
  const stack = await resolveElementStack(resolvedElement);
  const frameworkStackContext = formatElementStack(stack, { maxLines });

  let stackContext = "";
  if (reactStackContext && frameworkStackContext) {
    stackContext = mergeStackContext(
      reactStackContext,
      frameworkStackContext,
      maxLines,
    );
  } else {
    stackContext = reactStackContext || frameworkStackContext;
  }

  if (stackContext) {
    return `${html}${stackContext}`;
  }

  return getFallbackContext(resolvedElement);
};

const getFallbackContext = (element: Element): string => {
  const tagName = getTagName(element);

  if (!(element instanceof HTMLElement)) {
    const attrsHint = formatPriorityAttrs(element, {
      truncate: false,
      maxAttrs: PREVIEW_PRIORITY_ATTRS.length,
    });
    return `<${tagName}${attrsHint} />`;
  }

  const text = element.innerText?.trim() ?? element.textContent?.trim() ?? "";

  let attrsText = "";
  for (const { name, value } of element.attributes) {
    attrsText += ` ${name}="${value}"`;
  }

  const truncatedText = truncateString(text, PREVIEW_TEXT_MAX_LENGTH);

  if (truncatedText.length > 0) {
    return `<${tagName}${attrsText}>\n  ${truncatedText}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};

const truncateAttrValue = (value: string): string =>
  truncateString(value, PREVIEW_ATTR_VALUE_MAX_LENGTH);

interface FormatPriorityAttrsOptions {
  truncate?: boolean;
  maxAttrs?: number;
}

const formatPriorityAttrs = (
  element: Element,
  options: FormatPriorityAttrsOptions = {},
): string => {
  const { truncate = true, maxAttrs = PREVIEW_MAX_ATTRS } = options;
  const priorityAttrs: string[] = [];

  for (const name of PREVIEW_PRIORITY_ATTRS) {
    if (priorityAttrs.length >= maxAttrs) break;
    const value = element.getAttribute(name);
    if (value) {
      const formattedValue = truncate ? truncateAttrValue(value) : value;
      priorityAttrs.push(`${name}="${formattedValue}"`);
    }
  }

  return priorityAttrs.length > 0 ? ` ${priorityAttrs.join(" ")}` : "";
};

export const getHTMLPreview = (element: Element): string => {
  const tagName = getTagName(element);
  if (!(element instanceof HTMLElement)) {
    const attrsHint = formatPriorityAttrs(element);
    return `<${tagName}${attrsHint} />`;
  }
  const text = element.innerText?.trim() ?? element.textContent?.trim() ?? "";

  let attrsText = "";
  for (const { name, value } of element.attributes) {
    attrsText += ` ${name}="${truncateAttrValue(value)}"`;
  }

  const topElements: Array<Element> = [];
  const bottomElements: Array<Element> = [];
  let foundFirstText = false;

  const childNodes = Array.from(element.childNodes);
  for (const node of childNodes) {
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

  const formatElements = (elements: Array<Element>): string => {
    if (elements.length === 0) return "";
    if (elements.length <= 2) {
      return elements
        .map((childElement) => `<${getTagName(childElement)} ...>`)
        .join("\n  ");
    }
    return `(${elements.length} elements)`;
  };

  let content = "";
  const topElementsStr = formatElements(topElements);
  if (topElementsStr) content += `\n  ${topElementsStr}`;
  if (text.length > 0) {
    content += `\n  ${truncateString(text, PREVIEW_TEXT_MAX_LENGTH)}`;
  }
  const bottomElementsStr = formatElements(bottomElements);
  if (bottomElementsStr) content += `\n  ${bottomElementsStr}`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
