import {
  getOwnerStack,
  getSource,
  formatOwnerStack,
  hasDebugStack,
  parseStack,
  type StackFrame,
} from "bippy/source";
import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  getDisplayName,
  isCompositeFiber,
  traverseFiber,
  type Fiber,
} from "bippy";
import {
  PREVIEW_TEXT_MAX_LENGTH,
  PREVIEW_ATTR_VALUE_MAX_LENGTH,
  PREVIEW_MAX_ATTRS,
  PREVIEW_PRIORITY_ATTRS,
  PREVIEW_IDENTIFYING_ATTRS,
  SYMBOLICATION_TIMEOUT_MS,
  DEFAULT_MAX_CONTEXT_LINES,
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";
import { getNextBasePath } from "../utils/get-next-base-path.js";
import { normalizeFilePath } from "../utils/normalize-file-path.js";
import { safeDecodeURIComponent } from "../utils/safe-decode-uri-component.js";
import { classifySourcePath } from "../utils/source-frame-policy.js";
import { isInternalAttribute } from "../utils/strip-internal-attributes.js";
import {
  isInternalComponentName,
  isUsefulComponentName,
} from "../utils/is-useful-component-name.js";
import type { SourceOptions } from "../types.js";

let cachedIsNextProject: boolean | undefined;

export const isNextProjectRuntime = (shouldRevalidate?: boolean): boolean => {
  if (shouldRevalidate) {
    cachedIsNextProject = undefined;
  }
  cachedIsNextProject ??=
    typeof document !== "undefined" &&
    Boolean(document.getElementById("__NEXT_DATA__") || document.querySelector("nextjs-portal"));
  return cachedIsNextProject;
};

const isSourceComponentName = (name: string): boolean => {
  if (name.length <= 1) return false;
  if (isInternalComponentName(name)) return false;
  if (name[0] !== name[0].toUpperCase()) return false;
  if (name.endsWith("Provider") || name.endsWith("Context")) return false;
  return true;
};

const SERVER_COMPONENT_URL_PREFIXES = ["about://React/", "rsc://React/"];

const isServerComponentUrl = (url: string): boolean =>
  SERVER_COMPONENT_URL_PREFIXES.some((prefix) => url.startsWith(prefix));

const devirtualizeServerUrl = (url: string): string => {
  for (const prefix of SERVER_COMPONENT_URL_PREFIXES) {
    if (!url.startsWith(prefix)) continue;
    const environmentEndIndex = url.indexOf("/", prefix.length);
    if (environmentEndIndex === -1) continue;
    const pathStart = environmentEndIndex + 1;
    const querySuffixIndex = url.lastIndexOf("?");
    const rawPath =
      querySuffixIndex > pathStart ? url.slice(pathStart, querySuffixIndex) : url.slice(pathStart);
    return safeDecodeURIComponent(rawPath);
  }
  return url;
};

interface NextJsOriginalFrame {
  file: string | null;
  line1: number | null;
  column1: number | null;
  ignored: boolean;
}

interface NextJsFrameResult {
  status: string;
  value?: { originalStackFrame: NextJsOriginalFrame | null };
}

interface NextJsRequestFrame {
  file: string;
  methodName: string;
  line1: number | null;
  column1: number | null;
  arguments: string[];
}

const symbolicateServerFrames = async (frames: StackFrame[]): Promise<StackFrame[]> => {
  const serverFrameIndices: number[] = [];
  const requestFrames: NextJsRequestFrame[] = [];

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    if (!frame.isServer || !frame.fileName) continue;

    serverFrameIndices.push(frameIndex);
    requestFrames.push({
      file: devirtualizeServerUrl(frame.fileName),
      methodName: frame.functionName ?? "<unknown>",
      line1: frame.lineNumber ?? null,
      column1: frame.columnNumber ?? null,
      arguments: [],
    });
  }

  if (requestFrames.length === 0) return frames;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYMBOLICATION_TIMEOUT_MS);

  try {
    // Next.js dev server (>=15.2) exposes a batched symbolication endpoint that
    // resolves bundled/virtual stack frames back to original source locations via
    // source maps. Server components produce virtual URLs like
    // "rsc://React/Server/webpack-internal:///..." that have no real file on disk.
    // We POST an array of frames and get back PromiseSettledResult[].
    // getNextBasePath() is required for apps deployed with a basePath.
    const response = await fetch(`${getNextBasePath()}/__nextjs_original-stack-frames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frames: requestFrames,
        isServer: true,
        isEdgeServer: false,
        isAppDirectory: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return frames;

    const results = (await response.json()) as NextJsFrameResult[];
    const resolvedFrames = [...frames];

    for (let resultIndex = 0; resultIndex < serverFrameIndices.length; resultIndex++) {
      const result = results[resultIndex];
      if (result?.status !== "fulfilled") continue;

      const resolved = result.value?.originalStackFrame;
      if (!resolved?.file || resolved.ignored) continue;

      const originalFrameIndex = serverFrameIndices[resultIndex];
      resolvedFrames[originalFrameIndex] = {
        ...frames[originalFrameIndex],
        fileName: resolved.file,
        lineNumber: resolved.line1 ?? undefined,
        columnNumber: resolved.column1 ?? undefined,
        isSymbolicated: true,
      };
    }

    return resolvedFrames;
  } catch {
    return frames;
  } finally {
    clearTimeout(timeout);
  }
};

const extractServerFramesFromDebugStack = (rootFiber: Fiber): Map<string, StackFrame> => {
  const serverFramesByName = new Map<string, StackFrame>();

  traverseFiber(
    rootFiber,
    (currentFiber) => {
      if (!hasDebugStack(currentFiber)) return false;

      const ownerStack = formatOwnerStack(currentFiber._debugStack.stack);
      if (!ownerStack) return false;

      for (const frame of parseStack(ownerStack)) {
        if (!frame.functionName || !frame.fileName) continue;
        if (!isServerComponentUrl(frame.fileName)) continue;
        if (serverFramesByName.has(frame.functionName)) continue;

        serverFramesByName.set(frame.functionName, {
          ...frame,
          isServer: true,
        });
      }
      return false;
    },
    true,
  );

  return serverFramesByName;
};

const enrichServerFrameLocations = (rootFiber: Fiber, frames: StackFrame[]): StackFrame[] => {
  const hasUnresolvedServerFrames = frames.some(
    (frame) => frame.isServer && !frame.fileName && frame.functionName,
  );
  if (!hasUnresolvedServerFrames) return frames;

  const serverFramesByName = extractServerFramesFromDebugStack(rootFiber);
  if (serverFramesByName.size === 0) return frames;

  return frames.map((frame) => {
    if (!frame.isServer || frame.fileName || !frame.functionName) return frame;
    const resolved = serverFramesByName.get(frame.functionName);
    if (!resolved) return frame;
    return {
      ...frame,
      fileName: resolved.fileName,
      lineNumber: resolved.lineNumber,
      columnNumber: resolved.columnNumber,
    };
  });
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

const stackCache = new WeakMap<Element, Promise<StackFrame[] | null>>();
const fiberSourceCache = new WeakMap<Element, Promise<ResolvedSource | null>>();

const fetchStackForElement = async (element: Element): Promise<StackFrame[] | null> => {
  try {
    const fiber = getFiberFromHostInstance(element);
    if (!fiber) return null;

    const frames = await getOwnerStack(fiber);

    if (isNextProjectRuntime()) {
      const enrichedFrames = enrichServerFrameLocations(fiber, frames);
      return await symbolicateServerFrames(enrichedFrames);
    }

    return frames;
  } catch {
    return null;
  }
};

export const getStack = (element: Element): Promise<StackFrame[] | null> => {
  if (!isInstrumentationActive()) return Promise.resolve([]);

  const resolvedElement = findNearestFiberElement(element);
  const cached = stackCache.get(resolvedElement);
  if (cached) return cached;

  const promise = fetchStackForElement(resolvedElement);
  stackCache.set(resolvedElement, promise);
  return promise;
};

export const getNearestComponentName = async (element: Element): Promise<string | null> => {
  if (!isInstrumentationActive()) return null;
  const stack = await getStack(element);
  if (!stack) return null;

  for (const frame of stack) {
    if (frame.functionName && isSourceComponentName(frame.functionName)) {
      return frame.functionName;
    }
  }

  return null;
};

interface ResolvedSource {
  filePath: string;
  lineNumber: number | null;
  columnNumber: number | null;
  componentName: string | null;
}

const isApplicationSourceFile = (
  fileName: string | null | undefined,
  sourceOptions: SourceOptions | undefined,
): boolean => classifySourcePath(fileName, sourceOptions).kind === "app-source";

const pickSourceFrame = (frames: StackFrame[]): StackFrame | null => {
  const namedFrame = frames.find(
    (frame) => frame.functionName && isSourceComponentName(frame.functionName),
  );
  return namedFrame ?? frames[0] ?? null;
};

const getSourceComponentName = (fiber: Fiber | undefined): string | null => {
  if (!fiber || !isCompositeFiber(fiber)) return null;
  const name = getDisplayName(fiber.type);
  return name && isSourceComponentName(name) ? name : null;
};

// bippy's getSource prefers React's dev-only _debugSource (the real JSX location
// that bundlers like Webpack/Rspack drop from the owner stack) and otherwise
// falls back to the owner stack. We only trust app-owned source locations here;
// library sourcemap paths are left to the owner-stack scan.
// This reads React's own dev data, so it works without bippy instrumentation;
// getSource can still throw while parsing owner stacks, so it is guarded.
const getFiberSource = async (
  element: Element,
  sourceOptions?: SourceOptions,
): Promise<ResolvedSource | null> => {
  const fiber = getFiberFromHostInstance(findNearestFiberElement(element));
  if (!fiber) return null;

  try {
    const source = await getSource(fiber);
    if (!source?.fileName || !isApplicationSourceFile(source.fileName, sourceOptions)) {
      return null;
    }

    return {
      filePath: normalizeFilePath(source.fileName),
      lineNumber: source.lineNumber ?? null,
      columnNumber: source.columnNumber ?? null,
      componentName:
        (source.functionName && isSourceComponentName(source.functionName)
          ? source.functionName
          : null) ?? getSourceComponentName(fiber._debugOwner),
    };
  } catch {
    return null;
  }
};

const getCachedFiberSource = (
  element: Element,
  sourceOptions?: SourceOptions,
): Promise<ResolvedSource | null> => {
  const resolvedElement = findNearestFiberElement(element);
  if (sourceOptions?.ignorePaths?.length) {
    return getFiberSource(resolvedElement, sourceOptions);
  }

  const cached = fiberSourceCache.get(resolvedElement);
  if (cached) return cached;

  const promise = getFiberSource(resolvedElement, sourceOptions);
  fiberSourceCache.set(resolvedElement, promise);
  return promise;
};

interface ResolveSourceOptions {
  sourceOptions?: SourceOptions;
}

export const resolveSource = async (
  element: Element,
  options: ResolveSourceOptions = {},
): Promise<ResolvedSource | null> => {
  const fiberSource = await getCachedFiberSource(element, options.sourceOptions);
  if (fiberSource) return fiberSource;

  const stack = await getStack(element);
  if (!stack || stack.length === 0) return null;

  const appSourceFrames: StackFrame[] = [];
  const ignoredAppSourceFrames: StackFrame[] = [];
  const packageSourceFrames: StackFrame[] = [];
  for (const frame of stack) {
    const sourcePath = classifySourcePath(frame.fileName, options.sourceOptions);
    if (sourcePath.kind === "app-source") {
      appSourceFrames.push(frame);
    } else if (sourcePath.kind === "ignored-app-source") {
      ignoredAppSourceFrames.push(frame);
    } else if (sourcePath.kind === "package-source") {
      packageSourceFrames.push(frame);
    }
  }

  const sourceFrames =
    appSourceFrames.length > 0
      ? appSourceFrames
      : ignoredAppSourceFrames.length > 0
        ? ignoredAppSourceFrames
        : packageSourceFrames;
  const resolvedFrame = pickSourceFrame(sourceFrames);
  if (!resolvedFrame?.fileName) return null;

  return {
    filePath: normalizeFilePath(resolvedFrame.fileName),
    lineNumber: resolvedFrame.lineNumber ?? null,
    columnNumber: resolvedFrame.columnNumber ?? null,
    componentName:
      resolvedFrame.functionName && isSourceComponentName(resolvedFrame.functionName)
        ? resolvedFrame.functionName
        : null,
  };
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
  sourceOptions?: SourceOptions;
}

const getComponentNamesFromFiber = (element: Element, maxCount: number): string[] => {
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

// Next.js apps render from absolute paths; trimming them to a project-relative
// "/./…" form keeps displayed locations short and consistent with its stacks.
const NEXT_PROJECT_SOURCE_PATH_MARKERS = ["/src/app/", "/src/pages/", "/app/", "/pages/"];

const formatContextFilePath = (filePath: string, isNextProject: boolean): string => {
  const normalizedPath = normalizeFilePath(filePath);
  if (!isNextProject || !normalizedPath.startsWith("/")) return normalizedPath;

  for (const marker of NEXT_PROJECT_SOURCE_PATH_MARKERS) {
    const markerIndex = normalizedPath.indexOf(marker);
    if (markerIndex !== -1) return `/./${normalizedPath.slice(markerIndex + 1)}`;
  }

  return normalizedPath;
};

const formatSourceContextLine = (source: ResolvedSource, isNextProject: boolean): string => {
  const displayPath = formatContextFilePath(source.filePath, isNextProject);
  // HACK: bundlers like Vite produce unreliable line/column numbers from owner
  // stacks, so we only include them for Next.js where the dev server
  // symbolicates frames via source maps.
  const location =
    isNextProject && source.lineNumber
      ? `${displayPath}:${source.lineNumber}${source.columnNumber ? `:${source.columnNumber}` : ""}`
      : displayPath;
  return source.componentName
    ? `\n  in ${source.componentName} (at ${location})`
    : `\n  in ${location}`;
};

const formatStackContext = (
  stack: StackFrame[],
  options: StackContextOptions = {},
  leadingSource: ResolvedSource | null = null,
): string => {
  const { maxLines = DEFAULT_MAX_CONTEXT_LINES } = options;
  const isNextProject = isNextProjectRuntime();
  const lines: string[] = [];
  let previousLibraryFrameKey: string | null = null;
  let didDedupeLeadingComponent = false;

  if (leadingSource) {
    lines.push(formatSourceContextLine(leadingSource, isNextProject));
  }

  const emit = (line: string, libraryFrameKey: string | null) => {
    lines.push(line);
    previousLibraryFrameKey = libraryFrameKey;
  };

  for (const frame of stack) {
    if (lines.length >= maxLines) break;

    const sourcePath = classifySourcePath(frame.fileName, options.sourceOptions);
    if (sourcePath.kind === "ignored-app-source") continue;

    const libraryPackage = sourcePath.packageName;
    const resolvedSource = sourcePath.kind === "app-source" ? frame.fileName : null;

    const componentName =
      frame.functionName && isSourceComponentName(frame.functionName) ? frame.functionName : null;
    const libraryFrameKey = libraryPackage
      ? `${libraryPackage}:${componentName ?? ""}:${frame.isServer ? "server" : "client"}`
      : null;
    if (libraryFrameKey && libraryFrameKey === previousLibraryFrameKey) continue;

    // The owner stack's top frame is usually the same component the leading
    // source line already names. Drop only that single duplicate; deeper frames
    // sharing the name (e.g. recursive components) are kept.
    if (
      !didDedupeLeadingComponent &&
      componentName &&
      componentName === leadingSource?.componentName
    ) {
      didDedupeLeadingComponent = true;
      continue;
    }

    if (frame.isServer && !resolvedSource && (componentName || !frame.functionName)) {
      const tag = libraryPackage ? `${libraryPackage} at Server` : "at Server";
      emit(`\n  in ${componentName ?? "<anonymous>"} (${tag})`, libraryFrameKey);
      continue;
    }

    if (!resolvedSource && componentName) {
      emit(
        libraryPackage ? `\n  in ${componentName} (${libraryPackage})` : `\n  in ${componentName}`,
        libraryFrameKey,
      );
      continue;
    }

    if (libraryPackage) {
      emit(`\n  in ${libraryPackage}`, libraryFrameKey);
      continue;
    }

    if (resolvedSource) {
      emit(
        formatSourceContextLine(
          {
            componentName,
            filePath: resolvedSource,
            lineNumber: frame.lineNumber ?? null,
            columnNumber: frame.columnNumber ?? null,
          },
          isNextProject,
        ),
        null,
      );
    }
  }

  return lines.join("");
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const maxLines = options.maxLines ?? DEFAULT_MAX_CONTEXT_LINES;
  const leadingSource = await getCachedFiberSource(element, options.sourceOptions);
  const stack = await getStack(element);

  if (stack) {
    const stackContext = formatStackContext(stack, options, leadingSource);
    if (stackContext) return stackContext;
  }

  if (leadingSource) {
    return formatSourceContextLine(leadingSource, isNextProjectRuntime());
  }

  const componentNames = getComponentNamesFromFiber(findNearestFiberElement(element), maxLines);
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
  if (!(element instanceof HTMLElement)) {
    return getInlineHTMLPreview(element);
  }

  const tagName = getTagName(element);
  const attrsText = formatAttrsForPreview(element);
  const directText = getDirectTextContent(element);
  const truncatedText = truncateString(directText, PREVIEW_TEXT_MAX_LENGTH);

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

const getDirectTextContent = (element: Element): string => {
  let directText = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const trimmed = node.textContent?.trim() ?? "";
      if (trimmed) {
        directText += (directText ? " " : "") + trimmed;
      }
    }
  }
  return directText;
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
    const attrsHint = formatPriorityAttrs(element, {
      truncate: false,
      maxAttrs: PREVIEW_PRIORITY_ATTRS.length,
    });
    return `<${tagName}${attrsHint} />`;
  }

  const attrsText = formatAttrsForPreview(element);
  const directText = getDirectTextContent(element);
  const truncatedText = truncateString(directText, PREVIEW_TEXT_MAX_LENGTH);

  if (truncatedText) {
    return `<${tagName}${attrsText}>${truncatedText}</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};

export const getHTMLPreview = (element: Element): string => {
  const tagName = getTagName(element);
  const attrsText = formatAttrsForPreview(element);
  const directText = getDirectTextContent(element);

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

  let content = "";
  const topElementsStr = formatChildElements(topElements);
  if (topElementsStr) content += `\n  ${topElementsStr}`;
  if (directText.length > 0) {
    content += `\n  ${truncateString(directText, PREVIEW_TEXT_MAX_LENGTH)}`;
  }
  const bottomElementsStr = formatChildElements(bottomElements);
  if (bottomElementsStr) content += `\n  ${bottomElementsStr}`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
