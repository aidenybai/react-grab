import {
  getReactStack,
  resolveStack,
  formatStack,
  checkIsNextProject,
  resolveComponentName,
} from "element-source";
import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  getDisplayName,
  isCompositeFiber,
  traverseFiber,
} from "bippy";
import {
  PREVIEW_TEXT_MAX_LENGTH,
  PREVIEW_ATTR_VALUE_MAX_LENGTH,
  PREVIEW_MAX_ATTRS,
  PREVIEW_PRIORITY_ATTRS,
  DEFAULT_MAX_CONTEXT_LINES,
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";

export {
  checkIsNextProject,
  getReactStack as getStack,
  resolveComponentName as getNearestComponentName,
};

const NON_COMPONENT_PREFIXES = new Set([
  "_",
  "$",
  "motion.",
  "styled.",
  "chakra.",
  "ark.",
  "Primitive.",
  "Slot.",
]);

// Next.js App Router internals that wrap user components but are not useful
// as display names. Without filtering these the UI would show names like
// "InnerLayoutRouter" instead of the user's own component.
const NEXT_INTERNAL_COMPONENT_NAMES = new Set([
  "InnerLayoutRouter",
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "HTTPAccessFallbackErrorBoundary",
  "HTTPAccessFallbackBoundary",
  "LoadingBoundary",
  "ErrorBoundary",
  "InnerScrollAndFocusHandler",
  "ScrollAndFocusHandler",
  "RenderFromTemplateContext",
  "OuterLayoutRouter",
  "body",
  "html",
  "DevRootHTTPAccessFallbackBoundary",
  "AppDevOverlayErrorBoundary",
  "AppDevOverlay",
  "HotReload",
  "Router",
  "ErrorBoundaryHandler",
  "AppRouter",
  "ServerRoot",
  "SegmentStateProvider",
  "RootErrorBoundary",
  "LoadableComponent",
  "MotionDOMComponent",
]);

const REACT_INTERNAL_COMPONENT_NAMES = new Set([
  "Suspense",
  "Fragment",
  "StrictMode",
  "Profiler",
  "SuspenseList",
]);

const isUsefulComponentName = (name: string): boolean => {
  if (!name) return false;
  if (NEXT_INTERNAL_COMPONENT_NAMES.has(name)) return false;
  if (REACT_INTERNAL_COMPONENT_NAMES.has(name)) return false;
  for (const prefix of NON_COMPONENT_PREFIXES) {
    if (name.startsWith(prefix)) return false;
  }
  if (name === "SlotClone" || name === "Slot") return false;
  return true;
};

const findNearestFiberElement = (element: Element): Element => {
  if (!isInstrumentationActive()) return element;
  let current: Element | null = element;
  while (current) {
    if (getFiberFromHostInstance(current)) return current;
    current = current.parentElement;
  }
  return element;
};

export const getComponentDisplayName = (element: Element): string | null => {
  if (!isInstrumentationActive()) return null;
  const resolvedElement = findNearestFiberElement(element);
  const fiber = getFiberFromHostInstance(resolvedElement);
  if (!fiber) return null;

  let currentFiber = fiber.return;
  while (currentFiber) {
    if (isCompositeFiber(currentFiber)) {
      const name = getDisplayName(currentFiber.type);
      if (name && isUsefulComponentName(name)) {
        return name;
      }
    }
    currentFiber = currentFiber.return;
  }

  return null;
};

interface StackContextOptions {
  maxLines?: number;
}

const getComponentNamesFromFiber = (
  element: Element,
  maxCount: number,
): string[] => {
  if (!isInstrumentationActive()) return [];
  const fiber = getFiberFromHostInstance(element);
  if (!fiber) return [];

  const componentNames: string[] = [];
  traverseFiber(
    fiber,
    (currentFiber) => {
      if (componentNames.length >= maxCount) return true;
      if (isCompositeFiber(currentFiber)) {
        const name = getDisplayName(currentFiber.type);
        if (name && isUsefulComponentName(name)) {
          componentNames.push(name);
        }
      }
      return false;
    },
    true,
  );
  return componentNames;
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const maxLines = options.maxLines ?? DEFAULT_MAX_CONTEXT_LINES;
  const stack = await resolveStack(element);

  if (stack.length > 0) {
    return formatStack(stack, maxLines);
  }

  const componentNames = getComponentNamesFromFiber(element, maxLines);
  if (componentNames.length > 0) {
    return componentNames.map((name) => `\n  in ${name}`).join("");
  }

  return "";
};

export const getElementContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const resolvedElement = findNearestFiberElement(element);
  const html = getHTMLPreview(resolvedElement);
  const stackContext = await getStackContext(resolvedElement, options);

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
  const text =
    element instanceof HTMLElement
      ? (element.innerText?.trim() ?? element.textContent?.trim() ?? "")
      : (element.textContent?.trim() ?? "");

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
