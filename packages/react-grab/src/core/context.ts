import { getOwnerStack, getSource, type StackFrame } from "bippy/source";
import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  getDisplayName,
  isCompositeFiber,
  traverseFiber,
  type Fiber,
} from "bippy";
import { MAX_TRACE_CONTEXT_LINES } from "../constants.js";
import { resolveMaxContextLines } from "../utils/resolve-max-context-lines.js";
import { normalizeFilePath } from "../utils/normalize-file-path.js";
import {
  classifySourcePath,
  type SourcePathClassification,
} from "../utils/classify-source-path.js";
import { createElementSelector } from "../utils/create-element-selector.js";
import { isSharedUiSourcePath } from "../utils/is-shared-ui-source-path.js";
import { isNextProjectRuntime } from "../utils/is-next-project-runtime.js";
import { enrichServerFrameLocations, symbolicateServerFrames } from "./next-server-frames.js";
import { runQueuedSourceFetch } from "../utils/source-fetch-queue.js";
import { getHTMLPreview, getInlineHTMLPreview } from "./html-preview.js";
import {
  isInternalComponentName,
  isUsefulComponentName,
} from "../utils/is-useful-component-name.js";
import type { SourceLocation } from "../types.js";

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

// Elements rendered through `.map()` share one JSX source location, so the
// source line alone can't tell list instances apart. React assigns a `key` only
// to siblings in a list, so we surface the nearest keyed fiber above the picked
// node. The walk crosses at most one component boundary: enough to reach a key
// on the list item's host element, on the list-item component itself, or on a
// host wrapper around a list-item component, without wandering up to unrelated
// ancestor keys (e.g. a route or transition `key` many components above).
const getNearestListItemKey = (element: Element): string | null => {
  if (!isInstrumentationActive()) return null;
  let fiber: Fiber | null = getFiberFromHostInstance(findNearestFiberElement(element));
  let componentBoundariesCrossed = 0;
  while (fiber) {
    if (fiber.key) return fiber.key;
    if (isCompositeFiber(fiber)) {
      componentBoundariesCrossed += 1;
      if (componentBoundariesCrossed === 2) break;
    }
    fiber = fiber.return;
  }
  return null;
};

const stackCache = new WeakMap<Element, Promise<StackFrame[] | null>>();
const fiberSourceCache = new WeakMap<Element, Promise<ResolvedSource | null>>();

// Bundle/source-map fetches that bippy makes on react-grab's behalf. Routing
// them through our own fetch lets us mark them high priority (so they jump the
// app's in-flight data fetches when a connection frees) and cancel them via the
// queue's abort signal when the source-fetch timeout fires.
const createSourceFetch =
  (signal: AbortSignal) =>
  (url: string): Promise<Response> =>
    fetch(url, { signal, priority: "high" });

// getOwnerStack fetches the element's bundle and source map, and on Next.js the
// symbolication POST adds another request. Both go through the source-fetch
// queue so a hover storm (drag-select) or a multi-element copy never fans out
// more concurrent requests than the connection pool can serve.
const fetchStackForElement = (element: Element): Promise<StackFrame[] | null> =>
  runQueuedSourceFetch(async (signal) => {
    try {
      const fiber = getFiberFromHostInstance(element);
      if (!fiber) return null;

      const frames = await getOwnerStack(fiber, true, createSourceFetch(signal));

      if (isNextProjectRuntime()) {
        const enrichedFrames = enrichServerFrameLocations(fiber, frames);
        return await symbolicateServerFrames(enrichedFrames);
      }

      return frames;
    } catch {
      return null;
    }
  }, null);

export const getStack = (element: Element): Promise<StackFrame[] | null> => {
  if (!isInstrumentationActive()) return Promise.resolve([]);

  const nearestFiberElement = findNearestFiberElement(element);
  const cachedStackPromise = stackCache.get(nearestFiberElement);
  if (cachedStackPromise) return cachedStackPromise;

  // Evict failed or timed-out resolutions (null) so a later grab can retry once
  // the page's own fetches free a connection, while still deduping concurrent
  // in-flight lookups. A resolved empty array is a real "no frames" answer and
  // stays cached. Mirrors getCachedFiberSource.
  const stackPromise = fetchStackForElement(nearestFiberElement).then((stack) => {
    if (stack === null) stackCache.delete(nearestFiberElement);
    return stack;
  });
  stackCache.set(nearestFiberElement, stackPromise);
  return stackPromise;
};

export const getNearestComponentName = async (element: Element): Promise<string | null> => {
  if (!isInstrumentationActive()) return null;
  const stack = await getStack(element);
  if (!stack) return null;

  for (const frame of stack) {
    const componentName = toSourceComponentName(frame.functionName);
    if (componentName) return componentName;
  }

  return null;
};

export interface ResolvedSource extends SourceLocation {
  origin: SourcePathClassification["origin"];
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
// instrumentation, but it fetches the element's bundle/source map to map the
// location, so it runs through the source-fetch queue alongside getOwnerStack:
// both compete for the same connection pool and neither has its own timeout.
const getFiberSource = (element: Element): Promise<ResolvedSource | null> =>
  runQueuedSourceFetch(async (signal) => {
    const fiber = getFiberFromHostInstance(findNearestFiberElement(element));
    if (!fiber) return null;

    try {
      const source = await getSource(fiber, true, createSourceFetch(signal));
      if (!source?.fileName) return null;

      return {
        filePath: normalizeFilePath(source.fileName),
        lineNumber: source.lineNumber ?? null,
        columnNumber: source.columnNumber ?? null,
        componentName:
          toSourceComponentName(source.functionName) ?? getSourceComponentName(fiber._debugOwner),
        origin: classifySourcePath(source.fileName).origin,
      };
    } catch {
      return null;
    }
  }, null);

const getCachedFiberSource = (element: Element): Promise<ResolvedSource | null> => {
  const nearestFiberElement = findNearestFiberElement(element);
  const cachedFiberSourcePromise = fiberSourceCache.get(nearestFiberElement);
  if (cachedFiberSourcePromise) return cachedFiberSourcePromise;

  // Evict null resolutions so a later grab can retry once the fiber's source
  // metadata is attached, while still deduping concurrent in-flight lookups.
  const fiberSourcePromise = getFiberSource(nearestFiberElement).then((source) => {
    if (!source) fiberSourceCache.delete(nearestFiberElement);
    return source;
  });
  fiberSourceCache.set(nearestFiberElement, fiberSourcePromise);
  return fiberSourcePromise;
};

const ORIGIN_PREFERENCE_ORDER = ["app", "package"] as const;

export const selectResolvedSource = (
  fiberSource: ResolvedSource | null,
  stack: StackFrame[],
): ResolvedSource | null => {
  for (const origin of ORIGIN_PREFERENCE_ORDER) {
    if (fiberSource?.origin === origin) return fiberSource;
    const framesOfOrigin = stack.filter(
      (frame) => classifySourcePath(frame.fileName).origin === origin,
    );
    const preferredFrame = pickSourceFrame(framesOfOrigin);
    if (preferredFrame?.fileName) {
      return {
        filePath: normalizeFilePath(preferredFrame.fileName),
        lineNumber: preferredFrame.lineNumber ?? null,
        columnNumber: preferredFrame.columnNumber ?? null,
        componentName: toSourceComponentName(preferredFrame.functionName),
        origin,
      };
    }
  }
  return null;
};

export const resolveSource = async (element: Element): Promise<ResolvedSource | null> => {
  const fiberSource = await getCachedFiberSource(element);
  if (fiberSource?.origin === "app") return fiberSource;

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
        const displayName = getDisplayName(currentFiber.type);
        if (displayName && isUsefulComponentName(displayName)) {
          componentNames.push(displayName);
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
  // A real app-owned source file: suppresses the CSS selector-hint fallback.
  isAppSource: boolean;
  // High-signal app source that spends the line budget. Shared-UI frames are
  // app source but free, like package frames.
  consumesBudget: boolean;
}

const LOW_SIGNAL_FRAME: Pick<StackFrameLine, "isAppSource" | "consumesBudget"> = {
  isAppSource: false,
  consumesBudget: false,
};

const formatStackFrameLine = (
  frame: StackFrame,
  sourceClassification: SourcePathClassification,
  componentName: string | null,
  isNextProject: boolean,
): StackFrameLine | null => {
  const libraryPackage = sourceClassification.packageName;
  // Only app-owned frames contribute a file path; library frames render by
  // component name (e.g. "in Tabs (@radix-ui/react-tabs)") so node_modules
  // paths never compete with the resolved app source.
  const appSourceFilePath = sourceClassification.origin === "app" ? frame.fileName : null;

  if (frame.isServer && !appSourceFilePath && (componentName || !frame.functionName)) {
    const serverTag = libraryPackage ? `${libraryPackage} at Server` : "at Server";
    return {
      text: `\n  in ${componentName ?? "<anonymous>"} (${serverTag})`,
      ...LOW_SIGNAL_FRAME,
    };
  }

  if (!appSourceFilePath && componentName) {
    return {
      text: libraryPackage
        ? `\n  in ${componentName} (${libraryPackage})`
        : `\n  in ${componentName}`,
      ...LOW_SIGNAL_FRAME,
    };
  }

  if (libraryPackage) {
    return { text: `\n  in ${libraryPackage}`, ...LOW_SIGNAL_FRAME };
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
      isAppSource: true,
      consumesBudget: !isSharedUiSourcePath(appSourceFilePath),
    };
  }

  return null;
};

export const formatStackContext = (
  stack: StackFrame[],
  options: StackContextOptions = {},
  leadingSource: ResolvedSource | null = null,
): TraceContextResult => {
  const maxLines = resolveMaxContextLines(options.maxLines);
  // max, not min: the extended cap must sit above the soft budget. A
  // caller-raised maxContextLines is allowed to lift the hard cap past
  // MAX_TRACE_CONTEXT_LINES on purpose (opting into a deeper trace); min would
  // collapse the cap onto maxLines and disable the free low-signal extension.
  const hardMaxLines = Math.max(maxLines, MAX_TRACE_CONTEXT_LINES);
  const isNextProject = isNextProjectRuntime();
  const lines: string[] = [];
  let previousLibraryFrameKey: string | null = null;
  let didDedupeLeadingComponent = false;
  let hasTrustedSource = false;
  let budgetedLineCount = 0;

  if (leadingSource) {
    hasTrustedSource = leadingSource.origin === "app";
    // A shared-UI leading source means the user grabbed a primitive directly;
    // keep its budget free so the feature ancestors that consume it surface.
    if (!isSharedUiSourcePath(leadingSource.filePath)) budgetedLineCount += 1;
    lines.push(formatSourceContextLine(leadingSource, isNextProject));
  }

  for (const frame of stack) {
    // maxLines is the budget for high-signal app-source frames. Low-signal
    // lines (library frames and shared-UI/design-system app frames) are free:
    // they never consume the soft budget, only the hard cap, so wrapper noise
    // never crowds out the meaningful app source locations. maxLines of 0 is
    // therefore the minimal trace: only the leading source line, if any.
    if (budgetedLineCount >= maxLines || lines.length >= hardMaxLines) break;

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

    // Shared-UI frames are now surfaced for free, so a single primitives file
    // (e.g. several sidebar parts, or a recursive component) can emit the same
    // line repeatedly - especially under bundlers where we omit line numbers and
    // identical-looking frames collapse to the same text. Skip consecutive
    // duplicates so the trace stays readable.
    if (frameLine.text === lines[lines.length - 1]) continue;

    if (frameLine.isAppSource) hasTrustedSource = true;
    if (frameLine.consumesBudget) budgetedLineCount += 1;
    lines.push(frameLine.text);
    previousLibraryFrameKey = libraryFrameKey;
  }

  return {
    text: lines.join(""),
    shouldAppendSelectorHint: !hasTrustedSource,
  };
};

// Package sources are never promoted to the leading line: surfacing
// node_modules paths is what this avoids.
const resolveLeadingSource = async (element: Element): Promise<ResolvedSource | null> => {
  const fiberSource = await getCachedFiberSource(element);
  return fiberSource?.origin === "app" ? fiberSource : null;
};

const getTraceContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<TraceContextResult> => {
  const leadingSource = await resolveLeadingSource(element);
  const stack = await getStack(element);

  const stackContext = formatStackContext(stack ?? [], options, leadingSource);
  if (stackContext.text) return stackContext;

  const componentNames = getComponentNamesFromFiber(
    findNearestFiberElement(element),
    resolveMaxContextLines(options.maxLines),
  );
  if (componentNames.length > 0) {
    return {
      text: componentNames.map((componentName) => `\n  in ${componentName}`).join(""),
      shouldAppendSelectorHint: true,
    };
  }

  return { text: "", shouldAppendSelectorHint: true };
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const traceContext = await getTraceContext(element, options);
  return traceContext.text;
};

const composeElementContext = (element: Element, traceContext: TraceContextResult): string => {
  const listItemKey = getNearestListItemKey(element);
  const keyHint = listItemKey !== null ? `\n  key: "${listItemKey}"` : "";
  const selectorHint = traceContext.shouldAppendSelectorHint
    ? `\n  selector: ${createElementSelector(element)}`
    : "";
  return `${traceContext.text}${keyHint}${selectorHint}`;
};

export const getElementReferenceContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const traceContext = await getTraceContext(element, options);
  return `${getInlineHTMLPreview(element)}${composeElementContext(element, traceContext).replace(/\n\s+/g, " ")}`;
};

export const formatElementInfo = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const nearestFiberElement = findNearestFiberElement(element);
  const htmlPreview = getHTMLPreview(nearestFiberElement);
  const traceContext = await getTraceContext(nearestFiberElement, options);
  return `${htmlPreview}${composeElementContext(nearestFiberElement, traceContext)}`;
};
