import {
  getDisplayName,
  getFiberFromHostInstance,
  getLatestFiber,
  isCompositeFiber,
  isFiber,
  isHostFiber,
  traverseFiber,
} from "bippy";
// import { isCapitalized } from "./utils/is-capitalized.js";

import {
  FiberSource,
  getSource,
  isSourceFile,
  normalizeFileName,
} from "bippy/source";
import { isCapitalized } from "./utils/is-capitalized.js";

const NEXT_INTERNAL_COMPONENT_NAMES = [
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
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "HTTPAccessFallbackErrorBoundary",
  "HTTPAccessFallbackBoundary",
  "DevRootHTTPAccessFallbackBoundary",
  "AppDevOverlayErrorBoundary",
  "AppDevOverlay",
  "HotReload",
  "Router",
  "ErrorBoundaryHandler",
  "ErrorBoundary",
  "AppRouter",
  "ServerRoot",
  "SegmentStateProvider",
  "RootErrorBoundary",
];

export const checkIsNextProject = (): boolean => {
  return Boolean(document.getElementById("__NEXT_DATA__"));
};

export const checkIsInternalComponentName = (name: string): boolean => {
  if (name.startsWith("_")) return true;
  if (NEXT_INTERNAL_COMPONENT_NAMES.includes(name)) return true;
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
};

export const formatStack = (stack: Array<StackFrame>): string => {
  const isNextProject = checkIsNextProject();
  return stack
    .map(({ name, source }) => {
      if (!source) return `  at ${name}`;
      if (source.fileName.startsWith("about://React/Server")) {
        return `  at ${name} (Server)`;
      }
      if (!isSourceFile(source.fileName)) return `  at ${name}`;
      const framePart = `  at ${name} in ${normalizeFileName(source.fileName)}`;
      if (isNextProject) {
        return `${framePart}:${source.lineNumber}:${source.columnNumber}`;
      }
      // bundlers like vite fuck up the line number and column number
      return framePart;
    })
    .join("\n");
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

  let topElements = 0;
  let bottomElements = 0;
  let foundFirstText = false;

  const childNodes = Array.from(element.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) continue; // Comment

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent && node.textContent.trim().length > 0) {
        foundFirstText = true;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!foundFirstText) {
        topElements++;
      } else {
        bottomElements++;
      }
    }
  }

  let content = "";
  if (topElements > 0) content += `\n  (${topElements} elements)`;
  if (text.length > 0) content += `\n  ${text}`;
  if (bottomElements > 0) content += `\n  (${bottomElements} elements)`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
