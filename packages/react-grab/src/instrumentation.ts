import {
  getDisplayName,
  getFiberFromHostInstance,
  getLatestFiber,
  isCompositeFiber,
  isFiber,
  isHostFiber,
  traverseFiber,
  isInstrumentationActive,
} from "bippy";

import {
  FiberSource,
  getSource,
  isSourceFile,
  normalizeFileName,
} from "bippy/source";
import { isCapitalized } from "./utils/is-capitalized.js";

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
]);

export const checkIsNextProject = (): boolean => {
  if (typeof document === "undefined") return false;
  return Boolean(document.getElementById("__NEXT_DATA__"));
};

export const checkIsInternalComponentName = (name: string): boolean => {
  if (name.startsWith("_")) return true;
  if (NEXT_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  return false;
};

export const checkIsSourceComponentName = (name: string): boolean => {
  if (checkIsInternalComponentName(name)) return false;
  if (!isCapitalized(name)) return false;
  if (name.startsWith("Primitive.")) return false;
  if (name.includes("Provider") && name.includes("Context")) return false;
  return true;
};

export const getNearestComponentName = (element: Element): string | null => {
  if (!isInstrumentationActive()) return null;

  try {
    const fiber = getFiberFromHostInstance(element);
    if (!fiber) return null;

    let foundComponentName: string | null = null;
    traverseFiber(
      fiber,
      (currentFiber) => {
        if (isCompositeFiber(currentFiber)) {
          const displayName = getDisplayName(currentFiber);
          if (displayName && checkIsSourceComponentName(displayName)) {
            foundComponentName = displayName;
            return true;
          }
        }
        return false;
      },
      true,
    );

    return foundComponentName;
  } catch {
    return null;
  }
};

interface StackFrame {
  name: string;
  source: FiberSource | null;
}

interface UnresolvedStackFrame {
  name: string;
  sourcePromise: Promise<FiberSource | null>;
}

export const getStack = async (
  element: Element,
): Promise<Array<StackFrame>> => {
  if (!isInstrumentationActive()) return [];

  try {
    const maybeFiber = getFiberFromHostInstance(element);
    if (!maybeFiber || !isFiber(maybeFiber)) return [];
    const fiber = getLatestFiber(maybeFiber);

    const unresolvedStack: Array<UnresolvedStackFrame> = [];

    traverseFiber(
      fiber,
      (currentFiber) => {
        const displayName = isHostFiber(currentFiber)
          ? typeof currentFiber.type === "string"
            ? currentFiber.type
            : null
          : getDisplayName(currentFiber);

        if (displayName && !checkIsInternalComponentName(displayName)) {
          unresolvedStack.push({
            name: displayName,
            sourcePromise: getSource(currentFiber),
          });
        }
      },
      true,
    );

    const resolvedStack = await Promise.all(
      unresolvedStack.map(async (frame) => ({
        name: frame.name,
        source: await frame.sourcePromise,
      })),
    );

    return resolvedStack.filter((frame) => frame.source !== null);
  } catch {
    return [];
  }
};

export const formatElementInfo = async (element: Element): Promise<string> => {
  const html = getHTMLPreview(element);
  const stack = await getStack(element);
  console.log("stack", stack);
  const isNextProject = checkIsNextProject();

  let serverComponentName: string | null = null;
  let clientComponentName: string | null = null;
  let fileName: string | null = null;
  let lineNumber: number | null = null;
  let columnNumber: number | null = null;

  for (const frame of stack) {
    if (!frame.source) continue;

    if (frame.source.fileName.startsWith("about://React/")) {
      if (!serverComponentName && checkIsSourceComponentName(frame.name)) {
        serverComponentName = frame.name;
      }
      continue;
    }

    if (isSourceFile(frame.source.fileName)) {
      if (!fileName) {
        fileName = normalizeFileName(frame.source.fileName);
        lineNumber = frame.source.lineNumber ?? null;
        columnNumber = frame.source.columnNumber ?? null;
      }

      if (!clientComponentName && checkIsSourceComponentName(frame.name)) {
        clientComponentName = frame.name;
      }

      if (fileName && clientComponentName) {
        break;
      }
    }
  }

  const componentName = serverComponentName ?? clientComponentName;

  if (!componentName || !fileName) {
    return html;
  }

  let result = `${html}\nin ${componentName}`;

  if (serverComponentName && clientComponentName) {
    result += ` (Server, is child of client: ${clientComponentName})`;
  }

  result += ` at ${fileName}`;

  // HACK: bundlers like vite mess up the line number and column number
  if (isNextProject && lineNumber && columnNumber) {
    result += `:${lineNumber}:${columnNumber}`;
  }

  return result;
};

export const getFileName = (stack: Array<StackFrame>): string | null => {
  for (const frame of stack) {
    if (frame.source && isSourceFile(frame.source.fileName)) {
      return normalizeFileName(frame.source.fileName);
    }
  }
  return null;
};

export const getHTMLPreview = (element: Element): string => {
  const tagName = element.tagName.toLowerCase();
  if (!(element instanceof HTMLElement)) {
    return `<${tagName} />`;
  }
  const text = element.innerText?.trim() ?? element.textContent?.trim() ?? "";

  let attrsText = "";
  const attributes = Array.from(element.attributes);
  for (const attribute of attributes) {
    const name = attribute.name;
    let value = attribute.value;
    if (value.length > 20) {
      value = `${value.slice(0, 20)}...`;
    }
    attrsText += ` ${name}="${value}"`;
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
        .map((el) => `<${el.tagName.toLowerCase()} ...>`)
        .join("\n  ");
    }
    return `(${elements.length} elements)`;
  };

  let content = "";
  const topElementsStr = formatElements(topElements);
  if (topElementsStr) content += `\n  ${topElementsStr}`;
  if (text.length > 0) {
    const truncatedText = text.length > 100 ? `${text.slice(0, 100)}...` : text;
    content += `\n  ${truncatedText}`;
  }
  const bottomElementsStr = formatElements(bottomElements);
  if (bottomElementsStr) content += `\n  ${bottomElementsStr}`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
