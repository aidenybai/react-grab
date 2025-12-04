import {
  isSourceFile,
  normalizeFileName,
  getOwnerStack,
  StackFrame,
} from "bippy/source";
import { isCapitalized } from "./utils/is-capitalized.js";
import { getFiberFromHostInstance, isInstrumentationActive } from "bippy";

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

export const checkIsNextProject = (): boolean => {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.getElementById("__NEXT_DATA__") ||
      document.querySelector("nextjs-portal"),
  );
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

export const getStack = async (
  element: Element,
): Promise<StackFrame[] | null> => {
  if (!isInstrumentationActive()) return [];
  const fiber = getFiberFromHostInstance(element);
  if (!fiber) return null;
  return await getOwnerStack(fiber);
};

export const getNearestComponentName = async (
  element: Element,
): Promise<string | null> => {
  if (!isInstrumentationActive()) return null;
  const stack = await getStack(element);
  if (!stack) return null;

  for (const frame of stack) {
    if (frame.functionName && checkIsSourceComponentName(frame.functionName)) {
      return frame.functionName;
    }
  }

  return null;
};

interface GetElementContextOptions {
  maxLines?: number;
}

export const getElementContext = async (
  element: Element,
  options: GetElementContextOptions = {},
): Promise<string> => {
  const { maxLines = 3 } = options;
  const html = getHTMLPreview(element);
  const stack = await getStack(element);
  const isNextProject = checkIsNextProject();

  const stackContext: string[] = [];
  if (stack) {
    for (const frame of stack) {
      if (stackContext.length >= maxLines) break;

      if (
        frame.isServer &&
        (!frame.functionName || checkIsSourceComponentName(frame.functionName))
      ) {
        stackContext.push(
          `\n  in ${frame.functionName || "<anonymous>"} (at Server)`,
        );
        continue;
      }
      if (frame.fileName && isSourceFile(frame.fileName)) {
        let line = "\n  in ";
        const hasComponentName =
          frame.functionName && checkIsSourceComponentName(frame.functionName);

        if (hasComponentName) {
          line += `${frame.functionName} (at `;
        }

        line += normalizeFileName(frame.fileName);

        // HACK: bundlers like vite mess up the line number and column number
        if (isNextProject && frame.lineNumber && frame.columnNumber) {
          line += `:${frame.lineNumber}:${frame.columnNumber}`;
        }

        if (hasComponentName) {
          line += `)`;
        }

        stackContext.push(line);
      }
    }
  }

  return `${html}${stackContext.join("")}`;
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
