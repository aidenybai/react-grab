import {
  isSourceFile,
  normalizeFileName,
  getOwnerStack,
  sourceMapCache,
  getSourceMap,
  StackFrame,
} from "bippy/source";
import type { SourceMap } from "bippy/source";
import { isCapitalized } from "../utils/is-capitalized.js";
import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  getDisplayName,
  isCompositeFiber,
} from "bippy";

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

interface SourceMapData {
  [filename: string]: string;
}

const isWeakRef = (
  value: SourceMap | WeakRef<SourceMap>,
): value is WeakRef<SourceMap> =>
  typeof WeakRef !== "undefined" && value instanceof WeakRef;

const resolveSourceMapFromCache = (
  cacheEntry: SourceMap | WeakRef<SourceMap> | null,
): SourceMap | null => {
  if (!cacheEntry) return null;
  if (isWeakRef(cacheEntry)) return cacheEntry.deref() ?? null;
  return cacheEntry;
};

const extractSourceMapData = (sourceMap: SourceMap): SourceMapData => {
  const result: SourceMapData = {};

  const processSources = (
    sources: string[],
    contents: (string | null)[] | undefined,
  ) => {
    if (!contents) return;

    for (let i = 0; i < sources.length; i++) {
      const filename = normalizeFileName(sources[i]);
      const content = contents[i];
      if (filename && content && !result[filename]) {
        result[filename] = content;
      }
    }
  };

  if (sourceMap.sections) {
    for (const section of sourceMap.sections) {
      processSources(section.map.sources, section.map.sourcesContent);
    }
  }

  processSources(sourceMap.sources, sourceMap.sourcesContent);
  return result;
};

const hasJavaScriptType = (script: Element): boolean => {
  const type = script.getAttribute("type")?.toLowerCase().trim();
  return (
    !type ||
    type === "text/javascript" ||
    type === "application/javascript" ||
    type === "module"
  );
};

const getScriptUrls = (): string[] => {
  if (typeof document === "undefined") return [];

  const urls = new Set<string>();

  for (const script of Array.from(document.querySelectorAll("script[src]"))) {
    const src = script.getAttribute("src");
    if (!src || !hasJavaScriptType(script)) continue;

    try {
      const url = new URL(src, window.location.href).href;
      if (url.split("?")[0].endsWith(".js")) {
        urls.add(url);
      }
    } catch {
      continue;
    }
  }

  return Array.from(urls);
};

const getSourceMapDataFromCache = (): SourceMapData => {
  const result: SourceMapData = {};

  for (const cacheEntry of sourceMapCache.values()) {
    const sourceMap = resolveSourceMapFromCache(cacheEntry);
    if (sourceMap) {
      Object.assign(result, extractSourceMapData(sourceMap));
    }
  }

  return result;
};

const getSourceMapDataForUrl = async (url: string): Promise<SourceMapData> => {
  try {
    const sourceMap = await getSourceMap(url, true);
    return sourceMap ? extractSourceMapData(sourceMap) : {};
  } catch {
    return {};
  }
};

const getSourceMapDataFromScripts = async (): Promise<SourceMapData> => {
  const cachedUrls = new Set(sourceMapCache.keys());
  const uncachedUrls = getScriptUrls().filter((url) => !cachedUrls.has(url));

  const results = await Promise.all(
    uncachedUrls.map((url) => getSourceMapDataForUrl(url)),
  );

  const combined: SourceMapData = {};
  for (const data of results) {
    Object.assign(combined, data);
  }
  return combined;
};

let sourceMapDataCache: SourceMapData | null = null;
let sourceMapDataPromise: Promise<SourceMapData> | null = null;

const getSourceMapData = async (): Promise<SourceMapData> => {
  if (sourceMapDataCache) return sourceMapDataCache;

  if (!sourceMapDataPromise) {
    sourceMapDataPromise = (async () => {
      const cached = getSourceMapDataFromCache();
      const fromScripts = await getSourceMapDataFromScripts();
      sourceMapDataCache = { ...cached, ...fromScripts };
      return sourceMapDataCache;
    })();
  }

  return sourceMapDataPromise;
};

const getFileExtension = (filename: string): string => {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1] : "js";
};

const getSourceContext = (
  fileContent: string,
  lineNumber: number,
  contextLines: number,
): string => {
  const lines = fileContent.split("\n");
  const startLine = Math.max(0, lineNumber - contextLines - 1);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  const contextSnippet: string[] = [];
  const maxLineNumWidth = String(endLine).length;

  for (let i = startLine; i < endLine; i++) {
    const lineNum = String(i + 1).padStart(maxLineNumWidth, " ");
    contextSnippet.push(`${lineNum} | ${lines[i]}`);
  }

  return contextSnippet.join("\n");
};

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
  if (REACT_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  return false;
};

export const checkIsSourceComponentName = (name: string): boolean => {
  if (name.length <= 1) return false;
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

  try {
    const fiber = getFiberFromHostInstance(element);
    if (!fiber) return null;
    return await getOwnerStack(fiber);
  } catch {
    return null;
  }
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

const isUsefulComponentName = (name: string): boolean => {
  if (!name) return false;
  if (checkIsInternalComponentName(name)) return false;
  if (name.startsWith("Primitive.")) return false;
  if (name === "SlotClone" || name === "Slot") return false;
  return true;
};

export const getComponentDisplayName = (element: Element): string | null => {
  if (!isInstrumentationActive()) return null;
  const fiber = getFiberFromHostInstance(element);
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

interface GetElementContextOptions {
  maxLines?: number;
}

const CONTEXT_LINES = 3;

export const getElementContext = async (
  element: Element,
  options: GetElementContextOptions = {},
): Promise<string> => {
  const { maxLines = 3 } = options;
  const html = getHTMLPreview(element);
  const stack = await getStack(element);
  const isNextProject = checkIsNextProject();

  if (!stack) {
    return html;
  }

  const sourceMapData = isNextProject ? await getSourceMapData() : {};

  const stackContext: string[] = [];
  let hasAttachedSource = false;

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
      const filename = normalizeFileName(frame.fileName);
      const fileContent = sourceMapData[filename];

      if (!hasAttachedSource && isNextProject && fileContent && frame.lineNumber) {
        hasAttachedSource = true;
        const ext = getFileExtension(filename);
        const sourceContext = getSourceContext(
          fileContent,
          frame.lineNumber,
          CONTEXT_LINES,
        );
        const locationInfo = frame.columnNumber
          ? `${filename}:${frame.lineNumber}:${frame.columnNumber}`
          : `${filename}:${frame.lineNumber}`;

        stackContext.push(`\n\n\`\`\`${ext}\n${sourceContext}\n\`\`\`\nat ${locationInfo}`);
      } else {
        let line = "\n  in ";
        const hasComponentName =
          frame.functionName && checkIsSourceComponentName(frame.functionName);

        if (hasComponentName) {
          line += `${frame.functionName} (at `;
        }

        line += filename;

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
