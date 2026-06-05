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
import { classifySourcePath, type SourcePathClassification } from "../utils/source-frame-policy.js";
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

const toSourceComponentName = (name: string | null | undefined): string | null =>
  name && isSourceComponentName(name) ? name : null;

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
  // Raw path used for classification. normalizeFilePath strips a leading "./",
  // which scoped-package detection relies on, so classification must see the
  // unnormalized form (matching how stack frames are classified from fileName).
  sourceFileName: string;
}

const pickSourceFrame = (frames: StackFrame[]): StackFrame | null => {
  const namedFrame = frames.find(
    (frame) => frame.functionName && isSourceComponentName(frame.functionName),
  );
  return namedFrame ?? frames[0] ?? null;
};

const getSourceComponentName = (fiber: Fiber | undefined): string | null => {
  if (!fiber || !isCompositeFiber(fiber)) return null;
  return toSourceComponentName(getDisplayName(fiber.type));
};

const getFiberSource = async (element: Element): Promise<ResolvedSource | null> => {
  const fiber = getFiberFromHostInstance(findNearestFiberElement(element));
  if (!fiber) return null;

  try {
    const source = await getSource(fiber);
    if (!source?.fileName) return null;

    return {
      filePath: normalizeFilePath(source.fileName),
      lineNumber: source.lineNumber ?? null,
      columnNumber: source.columnNumber ?? null,
      componentName:
        toSourceComponentName(source.functionName) ?? getSourceComponentName(fiber._debugOwner),
      sourceFileName: source.fileName,
    };
  } catch {
    return null;
  }
};

const getCachedFiberSource = (element: Element): Promise<ResolvedSource | null> => {
  const resolvedElement = findNearestFiberElement(element);
  const cached = fiberSourceCache.get(resolvedElement);
  if (cached) return cached;

  const promise = getFiberSource(resolvedElement);
  fiberSourceCache.set(resolvedElement, promise);
  return promise;
};

const getApplicationFiberSource = async (
  element: Element,
  sourceOptions?: SourceOptions,
): Promise<ResolvedSource | null> => {
  const source = await getCachedFiberSource(element);
  if (!source || classifySourcePath(source.sourceFileName, sourceOptions).kind !== "app-source") {
    return null;
  }
  return source;
};

const resolveStackFrameSource = (frame: StackFrame | null | undefined): ResolvedSource | null => {
  if (!frame?.fileName) return null;
  return {
    filePath: normalizeFilePath(frame.fileName),
    lineNumber: frame.lineNumber ?? null,
    columnNumber: frame.columnNumber ?? null,
    componentName: toSourceComponentName(frame.functionName),
    sourceFileName: frame.fileName,
  };
};

interface ResolveSourceOptions {
  sourceOptions?: SourceOptions;
}

// Source candidates are resolved in descending preference: a frame the user
// actually owns beats one they configured to ignore, which beats third-party
// package code. Within each kind the fiber's own source wins over stack frames.
const RESOLVABLE_SOURCE_KINDS = ["app-source", "ignored-app-source", "package-source"] as const;

type ResolvableSourceKind = (typeof RESOLVABLE_SOURCE_KINDS)[number];

export type FramesBySourceKind = Record<ResolvableSourceKind, StackFrame[]>;

export const selectResolvedSource = (
  fiberSource: ResolvedSource | null,
  fiberSourceKind: SourcePathClassification["kind"],
  framesByKind: FramesBySourceKind,
): ResolvedSource | null => {
  for (const kind of RESOLVABLE_SOURCE_KINDS) {
    if (fiberSourceKind === kind) return fiberSource;
    const frameSource = resolveStackFrameSource(pickSourceFrame(framesByKind[kind]));
    if (frameSource) return frameSource;
  }
  return null;
};

export const resolveSource = async (
  element: Element,
  options: ResolveSourceOptions = {},
): Promise<ResolvedSource | null> => {
  const fiberSource = await getCachedFiberSource(element);
  const fiberSourceKind = classifySourcePath(fiberSource?.sourceFileName, options.sourceOptions).kind;
  if (fiberSourceKind === "app-source") return fiberSource;

  const framesByKind: FramesBySourceKind = {
    "app-source": [],
    "ignored-app-source": [],
    "package-source": [],
  };
  for (const frame of (await getStack(element)) ?? []) {
    const { kind } = classifySourcePath(frame.fileName, options.sourceOptions);
    if (kind !== "unknown") framesByKind[kind].push(frame);
  }

  return selectResolvedSource(fiberSource, fiberSourceKind, framesByKind);
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

// Branches are ordered by specificity: a server component (no on-disk source)
// first, then any frame named by component but lacking a source file, then a
// bare third-party package, and finally a real app source location. Returns
// null when the frame carries nothing worth rendering.
const formatStackFrameLine = (
  frame: StackFrame,
  sourcePath: SourcePathClassification,
  componentName: string | null,
  isNextProject: boolean,
): string | null => {
  const libraryPackage = sourcePath.packageName;
  // Only app-owned frames contribute a file path. Ignored UI-wrapper frames
  // render by component name (e.g. "in Button") so they stay as context without
  // surfacing a wrapper path that would compete with the resolved app source.
  const resolvedSource = sourcePath.kind === "app-source" ? frame.fileName : null;

  if (frame.isServer && !resolvedSource && (componentName || !frame.functionName)) {
    const tag = libraryPackage ? `${libraryPackage} at Server` : "at Server";
    return `\n  in ${componentName ?? "<anonymous>"} (${tag})`;
  }

  if (!resolvedSource && componentName) {
    return libraryPackage ? `\n  in ${componentName} (${libraryPackage})` : `\n  in ${componentName}`;
  }

  if (libraryPackage) {
    return `\n  in ${libraryPackage}`;
  }

  if (resolvedSource) {
    return formatSourceContextLine(
      {
        componentName,
        filePath: resolvedSource,
        lineNumber: frame.lineNumber ?? null,
        columnNumber: frame.columnNumber ?? null,
        sourceFileName: resolvedSource,
      },
      isNextProject,
    );
  }

  return null;
};

export const formatStackContext = (
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

  for (const frame of stack) {
    if (lines.length >= maxLines) break;

    const sourcePath = classifySourcePath(frame.fileName, options.sourceOptions);

    const componentName = toSourceComponentName(frame.functionName);
    const libraryFrameKey = sourcePath.packageName
      ? `${sourcePath.packageName}:${componentName ?? ""}:${frame.isServer ? "server" : "client"}`
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

    const line = formatStackFrameLine(frame, sourcePath, componentName, isNextProject);
    if (line === null) continue;

    lines.push(line);
    previousLibraryFrameKey = libraryFrameKey;
  }

  return lines.join("");
};

// The snippet leads with the app fiber's own JSX location when available.
// Otherwise it surfaces an ignored fallback (e.g. components/ui): those frames
// are dropped from the stack body but still back the selection metadata, so
// without this the copied snippet would omit the resolved path. App and package
// frames need no such handling — formatStackContext already renders them inline,
// and resolveSource only returns the ignored kind when no app source exists.
const resolveLeadingSource = async (
  element: Element,
  sourceOptions?: SourceOptions,
): Promise<ResolvedSource | null> => {
  const appFiberSource = await getApplicationFiberSource(element, sourceOptions);
  if (appFiberSource) return appFiberSource;

  const resolved = await resolveSource(element, { sourceOptions });
  if (
    resolved &&
    classifySourcePath(resolved.sourceFileName, sourceOptions).kind === "ignored-app-source"
  ) {
    return resolved;
  }
  return null;
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const maxLines = options.maxLines ?? DEFAULT_MAX_CONTEXT_LINES;
  const leadingSource = await resolveLeadingSource(element, options.sourceOptions);
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
