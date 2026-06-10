import { getOwnerStack, getSource, type StackFrame } from "bippy/source";
import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  getDisplayName,
  isCompositeFiber,
  traverseFiber,
  type Fiber,
} from "bippy";
import { DEFAULT_MAX_CONTEXT_LINES, MAX_TRACE_CONTEXT_LINES } from "../constants.js";
import { normalizeFilePath } from "../utils/normalize-file-path.js";
import { classifySourcePath, type SourcePathClassification } from "../utils/source-frame-policy.js";
import { createElementSelector } from "../utils/create-element-selector.js";
import { isNextProjectRuntime } from "../utils/is-next-project-runtime.js";
import { enrichServerFrameLocations, symbolicateServerFrames } from "./next-server-frames.js";
import { getHTMLPreview, getInlineHTMLPreview } from "./html-preview.js";
import {
  isInternalComponentName,
  isUsefulComponentName,
} from "../utils/is-useful-component-name.js";

const isSourceComponentName = (name: string): boolean => {
  if (name.length <= 1) return false;
  if (isInternalComponentName(name)) return false;
  if (name[0] !== name[0].toUpperCase()) return false;
  if (name.endsWith("Provider") || name.endsWith("Context")) return false;
  return true;
};

const toSourceComponentName = (name: string | null | undefined): string | null =>
  name && isSourceComponentName(name) ? name : null;

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
    const name = toSourceComponentName(frame.functionName);
    if (name) return name;
  }

  return null;
};

interface SourceLocation {
  filePath: string;
  lineNumber: number | null;
  columnNumber: number | null;
  componentName: string | null;
}

export interface ResolvedSource extends SourceLocation {
  kind: SourcePathClassification["kind"];
}

const pickSourceFrame = (frames: StackFrame[]): StackFrame | null => {
  const namedFrame = frames.find((frame) => Boolean(toSourceComponentName(frame.functionName)));
  return namedFrame ?? frames[0] ?? null;
};

const getSourceComponentName = (fiber: Fiber | undefined): string | null => {
  if (!fiber || !isCompositeFiber(fiber)) return null;
  return toSourceComponentName(getDisplayName(fiber.type));
};

// getSource reads React's own dev-only debug data, so it works without bippy
// instrumentation, but it can throw while parsing owner stacks.
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
      // Classify the raw path: normalizeFilePath strips the leading "./" that
      // scoped-package detection relies on.
      kind: classifySourcePath(source.fileName).kind,
    };
  } catch {
    return null;
  }
};

const getCachedFiberSource = (element: Element): Promise<ResolvedSource | null> => {
  const resolvedElement = findNearestFiberElement(element);
  const cached = fiberSourceCache.get(resolvedElement);
  if (cached) return cached;

  // Evict null resolutions so a later grab can retry once the fiber's source
  // metadata is attached, while still deduping concurrent in-flight lookups.
  const promise = getFiberSource(resolvedElement).then((source) => {
    if (!source) fiberSourceCache.delete(resolvedElement);
    return source;
  });
  fiberSourceCache.set(resolvedElement, promise);
  return promise;
};

const resolveStackFrameSource = (
  frame: StackFrame,
  kind: SourcePathClassification["kind"],
): ResolvedSource | null => {
  if (!frame.fileName) return null;
  return {
    filePath: normalizeFilePath(frame.fileName),
    lineNumber: frame.lineNumber ?? null,
    columnNumber: frame.columnNumber ?? null,
    componentName: toSourceComponentName(frame.functionName),
    kind,
  };
};

const SOURCE_KIND_PREFERENCE_ORDER = [
  "app-source",
  "ignored-app-source",
  "package-source",
] as const;

export const selectResolvedSource = (
  fiberSource: ResolvedSource | null,
  stack: StackFrame[],
): ResolvedSource | null => {
  for (const kind of SOURCE_KIND_PREFERENCE_ORDER) {
    if (fiberSource?.kind === kind) return fiberSource;
    const kindFrames = stack.filter((frame) => classifySourcePath(frame.fileName).kind === kind);
    const frame = pickSourceFrame(kindFrames);
    if (frame) {
      const frameSource = resolveStackFrameSource(frame, kind);
      if (frameSource) return frameSource;
    }
  }
  return null;
};

export const resolveSource = async (element: Element): Promise<ResolvedSource | null> => {
  const fiberSource = await getCachedFiberSource(element);
  if (fiberSource?.kind === "app-source") return fiberSource;

  return selectResolvedSource(fiberSource, (await getStack(element)) ?? []);
};

export const getComponentDisplayName = (element: Element): string | null =>
  getComponentNamesFromFiber(findNearestFiberElement(element), 1)[0] ?? null;

export interface StackContextOptions {
  maxLines?: number;
}

interface TraceContextResult {
  text: string;
  shouldAppendSelectorHint: boolean;
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

const formatSourceContextLine = (source: SourceLocation, isNextProject: boolean): string => {
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

interface StackFrameLine {
  text: string;
  isTrustedSource: boolean;
}

const formatStackFrameLine = (
  frame: StackFrame,
  sourceClassification: SourcePathClassification,
  componentName: string | null,
  isNextProject: boolean,
): StackFrameLine | null => {
  const libraryPackage = sourceClassification.packageName;
  // Only app-owned frames contribute a file path. Ignored UI-wrapper frames
  // render by component name (e.g. "in Button") so they stay as context without
  // surfacing a wrapper path that would compete with the resolved app source.
  const appSourceFilePath = sourceClassification.kind === "app-source" ? frame.fileName : null;

  if (frame.isServer && !appSourceFilePath && (componentName || !frame.functionName)) {
    const serverTag = libraryPackage ? `${libraryPackage} at Server` : "at Server";
    return {
      text: `\n  in ${componentName ?? "<anonymous>"} (${serverTag})`,
      isTrustedSource: false,
    };
  }

  if (!appSourceFilePath && componentName) {
    return {
      text: libraryPackage
        ? `\n  in ${componentName} (${libraryPackage})`
        : `\n  in ${componentName}`,
      isTrustedSource: false,
    };
  }

  if (libraryPackage) {
    return { text: `\n  in ${libraryPackage}`, isTrustedSource: false };
  }

  if (appSourceFilePath) {
    return {
      text: formatSourceContextLine(
        {
          componentName,
          filePath: appSourceFilePath,
          lineNumber: frame.lineNumber ?? null,
          columnNumber: frame.columnNumber ?? null,
        },
        isNextProject,
      ),
      isTrustedSource: true,
    };
  }

  return null;
};

export const formatStackContext = (
  stack: StackFrame[],
  options: StackContextOptions = {},
  leadingSource: ResolvedSource | null = null,
): TraceContextResult => {
  const { maxLines = DEFAULT_MAX_CONTEXT_LINES } = options;
  // max, not min: the dig-past-low-signal cap must sit above the soft budget
  // (min would collapse it onto maxLines and disable digging entirely).
  const hardMaxLines = Math.max(maxLines, MAX_TRACE_CONTEXT_LINES);
  const isNextProject = isNextProjectRuntime();
  const lines: string[] = [];
  let previousLibraryFrameKey: string | null = null;
  let didDedupeLeadingComponent = false;
  let hasTrustedSource = false;

  const emit = (line: StackFrameLine) => {
    if (line.isTrustedSource) {
      hasTrustedSource = true;
    }
    lines.push(line.text);
  };

  if (leadingSource) {
    emit({
      text: formatSourceContextLine(leadingSource, isNextProject),
      isTrustedSource: leadingSource.kind === "app-source",
    });
  }

  for (const frame of stack) {
    // Past the soft budget, keep digging until a trusted app frame or the hard cap.
    if (lines.length >= hardMaxLines) break;
    if (lines.length >= maxLines && hasTrustedSource) break;

    const sourceClassification = classifySourcePath(frame.fileName);

    const componentName = toSourceComponentName(frame.functionName);
    const libraryFrameKey = sourceClassification.packageName
      ? `${sourceClassification.packageName}:${componentName ?? ""}:${frame.isServer ? "server" : "client"}`
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

    const frameLine = formatStackFrameLine(
      frame,
      sourceClassification,
      componentName,
      isNextProject,
    );
    if (frameLine === null) continue;

    emit(frameLine);
    previousLibraryFrameKey = libraryFrameKey;
  }

  return {
    text: lines.join(""),
    shouldAppendSelectorHint: !hasTrustedSource,
  };
};

// Ignored components/ui sources are promoted to the leading line because their
// frames are dropped from the stack body yet still back the selection metadata,
// so the copied snippet would otherwise omit the resolved path. Package-only
// sources are never promoted: surfacing node_modules paths is what this avoids.
const resolveLeadingSource = async (element: Element): Promise<ResolvedSource | null> => {
  const fiberSource = await getCachedFiberSource(element);
  if (fiberSource?.kind === "app-source") return fiberSource;

  const fallbackSource = selectResolvedSource(fiberSource, (await getStack(element)) ?? []);
  return fallbackSource?.kind === "ignored-app-source" ? fallbackSource : null;
};

const getTraceContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<TraceContextResult> => {
  const maxLines = options.maxLines ?? DEFAULT_MAX_CONTEXT_LINES;
  const leadingSource = await resolveLeadingSource(element);
  const stack = await getStack(element);

  if (stack) {
    const stackContext = formatStackContext(stack, options, leadingSource);
    if (stackContext.text) return stackContext;
  }

  if (leadingSource) {
    return {
      text: formatSourceContextLine(leadingSource, isNextProjectRuntime()),
      shouldAppendSelectorHint: leadingSource.kind !== "app-source",
    };
  }

  const componentNames = getComponentNamesFromFiber(findNearestFiberElement(element), maxLines);
  if (componentNames.length > 0) {
    return {
      text: componentNames.map((name) => `\n  in ${name}`).join(""),
      shouldAppendSelectorHint: true,
    };
  }

  return {
    text: "",
    shouldAppendSelectorHint: true,
  };
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const traceContext = await getTraceContext(element, options);
  return traceContext.text;
};

const composeElementContext = (
  element: Element,
  htmlPreview: string,
  traceContext: TraceContextResult,
): string => {
  const selectorHint = traceContext.shouldAppendSelectorHint
    ? `\n  selector: ${createElementSelector(element)}`
    : "";
  return `${htmlPreview}${traceContext.text}${selectorHint}`;
};

export const getElementReferenceContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const traceContext = await getTraceContext(element, options);
  const contextText = composeElementContext(element, "", traceContext);
  return `${getInlineHTMLPreview(element)}${contextText.replace(/\n\s+/g, " ")}`;
};

export const formatElementInfo = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const resolvedElement = findNearestFiberElement(element);
  const htmlPreview = getHTMLPreview(resolvedElement);
  return composeElementContext(
    resolvedElement,
    htmlPreview,
    await getTraceContext(resolvedElement, options),
  );
};
