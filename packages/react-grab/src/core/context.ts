import {
  isSourceFile,
  getOwnerStack,
  formatOwnerStack,
  hasDebugStack,
  parseStack,
} from "bippy/source";
import type { StackFrame } from "bippy/source";
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
  SYMBOLICATION_TIMEOUT_MS,
  DEFAULT_MAX_CONTEXT_LINES,
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";
import { getNextBasePath } from "../utils/get-next-base-path.js";
import { normalizeFilePath } from "../utils/normalize-file-path.js";
import { parsePackageName } from "../utils/parse-package-name.js";
import { isInternalAttribute } from "../utils/strip-internal-attributes.js";
import { formatComponentInstance } from "../utils/format-component-instance.js";
import { getFiberComponentInfo } from "../utils/get-fiber-component-info.js";
import { getSourceSnippetForFrame, type SourceSnippet } from "../utils/get-source-snippet.js";
import { formatSourceSnippetBlock } from "../utils/format-source-snippet-block.js";
import {
  isInternalComponentName,
  isUsefulComponentName,
} from "../utils/is-useful-component-name.js";

let cachedIsNextProject: boolean | undefined;

export const checkIsNextProject = (revalidate?: boolean): boolean => {
  if (revalidate) {
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
    const querySuffixIndex = url.lastIndexOf("?");
    if (environmentEndIndex > -1 && querySuffixIndex > -1) {
      return decodeURI(url.slice(environmentEndIndex + 1, querySuffixIndex));
    }
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

const fetchStackForElement = async (element: Element): Promise<StackFrame[] | null> => {
  try {
    const fiber = getFiberFromHostInstance(element);
    if (!fiber) return null;

    const frames = await getOwnerStack(fiber);

    if (checkIsNextProject()) {
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

export const resolveSource = async (element: Element): Promise<ResolvedSource | null> => {
  const resolvedElement = findNearestFiberElement(element);
  const stack = await getStack(resolvedElement);
  if (!stack || stack.length === 0) return null;

  const sourceFrames = stack.filter((frame) => frame.fileName && isSourceFile(frame.fileName));

  const namedFrame = sourceFrames.find(
    (frame) => frame.functionName && isSourceComponentName(frame.functionName),
  );

  const resolvedFrame = namedFrame ?? sourceFrames[0];
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
}

interface ElementContextPartsInternalOptions extends StackContextOptions {
  includeSourceSnippet?: boolean;
}

export interface SourceSnippetInfo {
  filePath: string;
  snippet: SourceSnippet;
  block: string;
  key: string;
}

export interface ElementContextParts {
  htmlPreview: string;
  sourceSnippet: SourceSnippetInfo | null;
  stackLines: string[];
}

const hasFormattableFrames = (stack: StackFrame[] | null): boolean => {
  if (!stack) return false;
  return stack.some((frame) => {
    if (frame.fileName && isSourceFile(frame.fileName)) return true;
    if (frame.isServer && (!frame.functionName || isSourceComponentName(frame.functionName))) {
      return true;
    }
    if (frame.functionName && isSourceComponentName(frame.functionName)) return true;
    return false;
  });
};

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

const formatResolvedSourceLocation = (
  frame: StackFrame,
  filePath: string,
  isNextProject: boolean,
): string => {
  // HACK: bundlers like Vite produce unreliable line/column numbers from
  // owner stacks, so we only include them for Next.js where the dev server
  // symbolicates frames via source maps.
  if (isNextProject && frame.lineNumber) {
    const column = frame.columnNumber ? `:${frame.columnNumber}` : "";
    return `${normalizeFilePath(filePath)}:${frame.lineNumber}${column}`;
  }
  return normalizeFilePath(filePath);
};

const formatResolvedStackLine = (
  frame: StackFrame,
  filePath: string,
  componentName: string | null,
  componentInstanceText: string | null,
  isNextProject: boolean,
): string => {
  const location = formatResolvedSourceLocation(frame, filePath, isNextProject);
  if (componentInstanceText) {
    return `in ${componentInstanceText} (at ${location})`;
  }
  return componentName ? `in ${componentName} (at ${location})` : `in ${location}`;
};

interface StackContextInternalOptions extends StackContextOptions {
  innermostComponentInstanceText?: string | null;
  innermostComponentName?: string | null;
}

const formatStackLines = (
  stack: StackFrame[],
  options: StackContextInternalOptions = {},
): string[] => {
  const { maxLines = DEFAULT_MAX_CONTEXT_LINES } = options;
  const isNextProject = checkIsNextProject();
  const lines: string[] = [];
  // Tracks the last library we emitted so consecutive same-package frames
  // (a deeply nested Radix/MUI tree) collapse to one line and don't evict
  // the user's own component frames from the tight maxLines budget.
  let previousLibraryPackage: string | null = null;
  let didAttachComponentInstance = false;

  const emit = (line: string, libraryPackage: string | null) => {
    lines.push(line);
    previousLibraryPackage = libraryPackage;
  };

  for (const frame of stack) {
    if (lines.length >= maxLines) break;

    const resolvedSource = frame.fileName && isSourceFile(frame.fileName) ? frame.fileName : null;
    const libraryPackage = resolvedSource ? null : parsePackageName(frame.fileName);
    if (libraryPackage && libraryPackage === previousLibraryPackage) continue;

    const componentName =
      frame.functionName && isSourceComponentName(frame.functionName) ? frame.functionName : null;

    if (frame.isServer && !resolvedSource && (componentName || !frame.functionName)) {
      const tag = libraryPackage ? `${libraryPackage} at Server` : "at Server";
      emit(`in ${componentName ?? "<anonymous>"} (${tag})`, libraryPackage);
      continue;
    }

    // Library frames (from node_modules, vendor bundles, etc.) bypass the
    // user-source filter so the agent still sees names like `SquareIcon`
    // that the user actually selected, tagged with the originating package
    // when we can recover it from the file path.
    if (!resolvedSource && componentName) {
      emit(
        libraryPackage ? `in ${componentName} (${libraryPackage})` : `in ${componentName}`,
        libraryPackage,
      );
      continue;
    }

    if (resolvedSource) {
      // Only attach props when the resolved frame name matches the fiber walk,
      // otherwise we'd paint the wrong component's props onto the wrong line.
      const shouldAttachInstance =
        !didAttachComponentInstance &&
        Boolean(options.innermostComponentInstanceText) &&
        componentName !== null &&
        componentName === options.innermostComponentName;
      const componentInstanceText = shouldAttachInstance
        ? (options.innermostComponentInstanceText ?? null)
        : null;
      if (shouldAttachInstance) didAttachComponentInstance = true;
      emit(
        formatResolvedStackLine(
          frame,
          resolvedSource,
          componentName,
          componentInstanceText,
          isNextProject,
        ),
        null,
      );
    }
  }

  return lines;
};

const buildSourceSnippetInfo = async (
  stack: StackFrame[],
  componentName: string | null,
): Promise<SourceSnippetInfo | null> => {
  const frame = stack.find((candidate) => candidate.fileName && isSourceFile(candidate.fileName));
  if (!frame?.fileName) return null;

  const snippet = await getSourceSnippetForFrame(frame, { componentName });
  if (!snippet) return null;

  const filePath = normalizeFilePath(frame.fileName);
  return {
    filePath,
    snippet,
    block: formatSourceSnippetBlock(snippet, filePath),
    key: `${filePath}:${snippet.highlightLine}`,
  };
};

const buildContextParts = async (
  element: Element,
  options: ElementContextPartsInternalOptions,
): Promise<ElementContextParts> => {
  const resolvedElement = findNearestFiberElement(element);
  const htmlPreview = getHTMLPreview(resolvedElement);
  const maxLines = options.maxLines ?? DEFAULT_MAX_CONTEXT_LINES;
  const stack = await getStack(resolvedElement);

  if (stack && hasFormattableFrames(stack)) {
    const componentInfo = getFiberComponentInfo(resolvedElement);
    const sourceSnippet = options.includeSourceSnippet
      ? await buildSourceSnippetInfo(stack, componentInfo?.name ?? null)
      : null;
    // When a trustworthy snippet is present its literal JSX supersedes the
    // props line, so we drop the props to avoid near-duplicate output.
    const hasTrustworthySnippet = Boolean(sourceSnippet) && !sourceSnippet?.snippet.isApproximate;
    const componentInstanceText =
      hasTrustworthySnippet || !componentInfo
        ? null
        : formatComponentInstance({ name: componentInfo.name, props: componentInfo.props });
    const stackLines = formatStackLines(stack, {
      maxLines,
      innermostComponentInstanceText: componentInstanceText,
      innermostComponentName: componentInfo?.name ?? null,
    });
    return { htmlPreview, sourceSnippet, stackLines };
  }

  const componentNames = getComponentNamesFromFiber(resolvedElement, maxLines);
  if (componentNames.length > 0) {
    // Without a formattable owner stack, the source snippet is unreachable —
    // surface the fiber's memoized props on the innermost component name so
    // the agent still gets the call shape.
    const componentInfo = getFiberComponentInfo(resolvedElement);
    const componentInstanceText =
      componentInfo && componentInfo.name === componentNames[0]
        ? formatComponentInstance({ name: componentInfo.name, props: componentInfo.props })
        : null;
    const stackLines = componentNames.map((name, nameIndex) =>
      nameIndex === 0 && componentInstanceText ? `in ${componentInstanceText}` : `in ${name}`,
    );
    return { htmlPreview, sourceSnippet: null, stackLines };
  }

  return {
    htmlPreview: getFallbackContext(resolvedElement),
    sourceSnippet: null,
    stackLines: [],
  };
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const parts = await buildContextParts(element, { ...options, includeSourceSnippet: false });
  if (parts.stackLines.length === 0) return "";
  return parts.stackLines.map((line) => `\n  ${line}`).join("");
};

export const getElementContextParts = (
  element: Element,
  options: StackContextOptions = {},
): Promise<ElementContextParts> =>
  buildContextParts(element, { ...options, includeSourceSnippet: true });

export const formatElementContextParts = (parts: ElementContextParts): string => {
  const stackText = parts.stackLines.map((line) => `\n  ${line}`).join("");
  if (!parts.sourceSnippet) return `${parts.htmlPreview}${stackText}`;
  const stackSection = stackText ? `\n${stackText}` : "";
  return `${parts.htmlPreview}\n\n${parts.sourceSnippet.block}${stackSection}`;
};

export const getElementContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const parts = await getElementContextParts(element, options);
  return formatElementContextParts(parts);
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
    if (isInternalAttribute(name)) continue;
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
    if (isInternalAttribute(name)) continue;
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
      return elements.map((childElement) => `<${getTagName(childElement)} ...>`).join("\n  ");
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
