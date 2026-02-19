import {
  isSourceFile,
  normalizeFileName,
  getOwnerStack,
  formatOwnerStack,
  hasDebugStack,
  parseStack,
  StackFrame,
} from "bippy/source";
import { isCapitalized } from "../utils/is-capitalized.js";
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
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";

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

let cachedIsNextProject: boolean | undefined;

export const checkIsNextProject = (revalidate?: boolean): boolean => {
  if (revalidate) {
    cachedIsNextProject = undefined;
  }
  cachedIsNextProject ??=
    typeof document !== "undefined" &&
    Boolean(
      document.getElementById("__NEXT_DATA__") ||
      document.querySelector("nextjs-portal"),
    );
  return cachedIsNextProject;
};

const checkIsInternalComponentName = (name: string): boolean => {
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

const symbolicateServerFrames = async (
  frames: StackFrame[],
): Promise<StackFrame[]> => {
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
  const timeout = setTimeout(
    () => controller.abort(),
    SYMBOLICATION_TIMEOUT_MS,
  );

  try {
    // Next.js dev server (>=15.2) exposes a batched symbolication endpoint that resolves
    // bundled/virtual stack frames back to original source locations via source maps.
    //
    // Server components produce virtual URLs like "rsc://React/Server/webpack-internal:///..."
    // that have no real file on disk. The dev server reads the bundler's source maps
    // (webpack or turbopack) and returns the original file path, line, and column for each frame.
    //
    // We POST an array of frames and get back PromiseSettledResult<OriginalStackFrameResponse>[]:
    //
    //   POST /__nextjs_original-stack-frames
    //   { frames: [{ file, methodName, lineNumber, column, arguments }],
    //     isServer: true, isEdgeServer: false, isAppDirectory: true }
    //
    //   Response: [{ status: "fulfilled",
    //     value: { originalStackFrame: { file, lineNumber, column, ignored } } }]
    //
    // Introduced by vercel/next.js#75557 (batched POST, replaces legacy per-frame GET).
    // Handler: packages/next/src/client/components/react-dev-overlay/server/middleware-webpack.ts
    // Types:   packages/next/src/client/components/react-dev-overlay/server/shared.ts
    const response = await fetch("/__nextjs_original-stack-frames", {
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

    for (let i = 0; i < serverFrameIndices.length; i++) {
      const result = results[i];
      if (result?.status !== "fulfilled") continue;

      const resolved = result.value?.originalStackFrame;
      if (!resolved?.file || resolved.ignored) continue;

      const originalFrameIndex = serverFrameIndices[i];
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

const extractServerFramesFromDebugStack = (
  rootFiber: Fiber,
): Map<string, StackFrame> => {
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

const enrichServerFrameLocations = (
  rootFiber: Fiber,
  frames: StackFrame[],
): StackFrame[] => {
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

const stackCache = new WeakMap<Element, Promise<StackFrame[] | null>>();

const fetchStackForElement = async (
  element: Element,
): Promise<StackFrame[] | null> => {
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

  const cached = stackCache.get(element);
  if (cached) return cached;

  const promise = fetchStackForElement(element);
  stackCache.set(element, promise);
  return promise;
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

export const resolveSourceFromStack = (
  stack: StackFrame[] | null,
): {
  filePath: string;
  lineNumber: number | undefined;
  componentName: string | null;
} | null => {
  if (!stack || stack.length === 0) return null;
  for (const frame of stack) {
    if (frame.fileName && isSourceFile(frame.fileName)) {
      return {
        filePath: normalizeFileName(frame.fileName),
        lineNumber: frame.lineNumber,
        componentName:
          frame.functionName && checkIsSourceComponentName(frame.functionName)
            ? frame.functionName
            : null,
      };
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

const hasSourceFiles = (stack: StackFrame[] | null): boolean => {
  if (!stack) return false;
  return stack.some(
    (frame) =>
      frame.isServer || (frame.fileName && isSourceFile(frame.fileName)),
  );
};

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

export const getElementContext = async (
  element: Element,
  options: GetElementContextOptions = {},
): Promise<string> => {
  const { maxLines = 3 } = options;
  const stack = await getStack(element);
  const html = getHTMLPreview(element);

  if (stack && hasSourceFiles(stack)) {
    const isNextProject = checkIsNextProject();
    const stackContext: string[] = [];

    for (const frame of stack) {
      if (stackContext.length >= maxLines) break;

      const hasResolvedSource = frame.fileName && isSourceFile(frame.fileName);

      if (
        frame.isServer &&
        !hasResolvedSource &&
        (!frame.functionName || checkIsSourceComponentName(frame.functionName))
      ) {
        stackContext.push(
          `\n  in ${frame.functionName || "<anonymous>"} (at Server)`,
        );
        continue;
      }

      if (hasResolvedSource) {
        let line = "\n  in ";
        const hasComponentName =
          frame.functionName && checkIsSourceComponentName(frame.functionName);

        if (hasComponentName) {
          line += `${frame.functionName} (at `;
        }

        line += normalizeFileName(frame.fileName!);

        // HACK: bundlers like vite mess up the line/column numbers, so we don't show them
        if (isNextProject && frame.lineNumber && frame.columnNumber) {
          line += `:${frame.lineNumber}:${frame.columnNumber}`;
        }

        if (hasComponentName) {
          line += `)`;
        }

        stackContext.push(line);
      }
    }

    return `${html}${stackContext.join("")}`;
  }

  const componentNames = getComponentNamesFromFiber(element, maxLines);
  if (componentNames.length > 0) {
    const componentContext = componentNames
      .map((name) => `\n  in ${name}`)
      .join("");
    return `${html}${componentContext}`;
  }

  return getFallbackContext(element);
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

const getHTMLPreview = (element: Element): string => {
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
