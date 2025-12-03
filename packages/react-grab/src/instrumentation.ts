import {
  getDisplayName,
  getFiberFromHostInstance,
  getLatestFiber,
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
  getSourcesFromStack,
  getOwnerStack,
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

    const ownerStack = getOwnerStack(maybeFiber);
    const sources = await getSourcesFromStack(ownerStack);

    if (sources && sources.length > 0) {
      const stack: Array<StackFrame> = [];
      for (const source of sources) {
        if (
          source.functionName &&
          !checkIsInternalComponentName(source.functionName)
        ) {
          stack.push({
            name: source.functionName,
            source: source.fileName
              ? {
                  fileName: source.fileName,
                  lineNumber: source.lineNumber,
                  columnNumber: source.columnNumber,
                }
              : null,
          });
        }
      }
      if (stack.length > 0) {
        return stack;
      }
    }

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

export const getNearestComponentName = async (
  element: Element,
): Promise<string | null> => {
  const stack = await getStack(element);

  for (const frame of stack) {
    if (checkIsSourceComponentName(frame.name)) {
      return frame.name;
    }
  }

  return null;
};

export const formatElementInfo = async (element: Element): Promise<string> => {
  const html = getHTMLPreview(element);
  const stack = await getStack(element);
  const isNextProject = checkIsNextProject();

  let fileName: string | null = null;
  let lineNumber: number | null = null;
  let columnNumber: number | null = null;

  let serverComponentName: string | null = null;
  let clientComponentName: string | null = null;

  for (const frame of stack) {
    if (checkIsSourceComponentName(frame.name) && !serverComponentName) {
      serverComponentName = frame.name;
      continue;
    }

    if (!frame.source) continue;

    if (isSourceFile(frame.source.fileName) && !fileName) {
      fileName = normalizeFileName(frame.source.fileName);
      lineNumber = frame.source.lineNumber ?? null;
      columnNumber = frame.source.columnNumber ?? null;
      clientComponentName = frame.name;
      continue;
    }
  }

  let result = html;

  if (serverComponentName) {
    result += `\n  in ${serverComponentName} (Server)`;
  }

  if (fileName) {
    result += `\n${clientComponentName ? `  in ${clientComponentName}` : ""} at ${fileName}`;

    // HACK: bundlers like vite mess up the line number and column number
    if (isNextProject && lineNumber && columnNumber) {
      result += `:${lineNumber}:${columnNumber}`;
    }
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
