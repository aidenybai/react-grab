import {
  instrument,
  isInstrumentationActive,
  traverseRenderedFibers,
  isCompositeFiber,
  getDisplayName,
  getNearestHostFibers,
  getTimings,
  hasMemoCache,
  traverseProps,
  traverseState,
  traverseContexts,
  getFiberId,
  type Fiber,
  type FiberRoot,
} from "bippy";
import {
  RENDER_SCAN_MAX_LOG_ENTRIES,
  LOAF_MAX_ENTRIES,
  LOAF_THRESHOLD_MS,
  ACTIVITY_TYPE_RENDER,
  ACTIVITY_TYPE_EFFECT,
  EFFECT_TYPE_PASSIVE,
  EFFECT_TYPE_LAYOUT,
  EFFECT_TYPE_INSERTION,
  EFFECT_PHASE_CREATE,
  EFFECT_PHASE_DESTROY,
  RENDER_PHASE_MOUNT,
  RENDER_PHASE_UPDATE,
  CAUSE_TYPE_INITIAL,
  CAUSE_TYPE_PROPS,
  CAUSE_TYPE_STATE,
  CAUSE_TYPE_CONTEXT,
  CAUSE_TYPE_PARENT,
} from "../constants.js";
import {
  recordActivity,
  getEntriesInWindow,
  getAllEntries,
  clearBuffer,
  getString,
  type ActivityEntry,
} from "./performance-buffer.js";
import type {
  LoAFEntry,
  LoAFScriptAttribution,
  PerformanceDiagnostic,
  PerformanceDiagnosticSummary,
  PerformanceFrame,
  PerformanceFrameBreakdown,
  PerformanceFrameContributor,
  RenderExecution,
  EffectExecution,
  ComponentIdentity,
  ComponentStats,
  PerformanceRecommendation,
} from "../types.js";

interface PendingRender {
  fiber: Fiber;
  phase: string;
  componentName: string;
  renderCount: number;
  domElements: Element[];
}

interface RenderCause {
  componentName: string;
  prop: string | null;
}

interface LogEntry {
  message: string;
  totalTime: number;
}

type RenderCallback = (renders: PendingRender[]) => void;

const RECORDING_STORAGE_KEY = "react-grab-recording-state";

let renderLogHistory: string[] = [];
let isScanRecordingActive = false;
let didInitializeInstrumentation = false;
let didInitializeScanModule = false;
let renderCallback: RenderCallback | null = null;

const rendersInCurrentCommit = new Map<Fiber, PendingRender>();
const fiberIdsRenderedInCommit = new Set<number>();

let loafObserver: PerformanceObserver | null = null;
const recentLoAFs: LoAFEntry[] = [];
const wrappedEffects = new WeakSet<object>();
let diagnosticSessionId = "";

interface PerformanceLongAnimationFrameTiming extends PerformanceEntry {
  blockingDuration: number;
  renderStart: number;
  styleAndLayoutStart: number;
  firstUIEventTimestamp: number;
  scripts: PerformanceScriptTiming[];
}

interface PerformanceScriptTiming extends PerformanceEntry {
  invokerType: string;
  invoker: string;
  sourceURL: string;
  sourceFunctionName: string;
  sourceCharPosition: number;
  executionStart: number;
  forcedStyleAndLayoutDuration: number;
  pauseDuration: number;
}

const isLoAFSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  if (typeof PerformanceObserver === "undefined") return false;
  try {
    return PerformanceObserver.supportedEntryTypes.includes(
      "long-animation-frame",
    );
  } catch {
    return false;
  }
};

const setupLoAFObserver = (): void => {
  if (!isLoAFSupported() || loafObserver) return;

  loafObserver = new PerformanceObserver((entryList) => {
    for (const performanceEntry of entryList.getEntries()) {
      const loafTiming =
        performanceEntry as PerformanceLongAnimationFrameTiming;
      const loafEntry: LoAFEntry = {
        startTime: loafTiming.startTime,
        duration: loafTiming.duration,
        blockingDuration: loafTiming.blockingDuration,
        renderStart: loafTiming.renderStart,
        styleAndLayoutStart: loafTiming.styleAndLayoutStart,
        firstUIEventTimestamp: loafTiming.firstUIEventTimestamp,
        scripts: loafTiming.scripts.map(
          (scriptTiming): LoAFScriptAttribution => ({
            invokerType: scriptTiming.invokerType,
            invoker: scriptTiming.invoker,
            sourceURL: scriptTiming.sourceURL,
            sourceFunctionName: scriptTiming.sourceFunctionName,
            sourceCharPosition: scriptTiming.sourceCharPosition,
            executionStart: scriptTiming.executionStart,
            duration: scriptTiming.duration,
            forcedStyleAndLayoutDuration:
              scriptTiming.forcedStyleAndLayoutDuration,
            pauseDuration: scriptTiming.pauseDuration,
          }),
        ),
      };

      recentLoAFs.push(loafEntry);
      if (recentLoAFs.length > LOAF_MAX_ENTRIES) {
        recentLoAFs.shift();
      }
    }
  });

  loafObserver.observe({ type: "long-animation-frame", buffered: true });
};

const teardownLoAFObserver = (): void => {
  if (loafObserver) {
    loafObserver.disconnect();
    loafObserver = null;
  }
};

const loadPersistedState = (): boolean => {
  try {
    const stored = localStorage.getItem(RECORDING_STORAGE_KEY);
    if (!stored) return false;
    return (
      (JSON.parse(stored) as { isRecording: boolean }).isRecording ?? false
    );
  } catch {
    return false;
  }
};

const persistState = (recording: boolean): void => {
  try {
    localStorage.setItem(
      RECORDING_STORAGE_KEY,
      JSON.stringify({ isRecording: recording }),
    );
  } catch {}
};

const isShallowEqual = (objectA: unknown, objectB: unknown): boolean => {
  if (Object.is(objectA, objectB)) return true;
  if (
    typeof objectA !== "object" ||
    objectA === null ||
    typeof objectB !== "object" ||
    objectB === null
  ) {
    return false;
  }
  const keysA = Object.keys(objectA);
  const keysB = Object.keys(objectB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(objectB, key) ||
      !Object.is(
        (objectA as Record<string, unknown>)[key],
        (objectB as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }
  return true;
};

const isDeepEqual = (
  objectA: unknown,
  objectB: unknown,
  depth = 0,
): boolean => {
  if (depth > 5) return false;
  if (Object.is(objectA, objectB)) return true;
  if (typeof objectA !== typeof objectB) return false;
  if (typeof objectA === "function" && typeof objectB === "function") {
    return objectA.toString() === objectB.toString();
  }
  if (
    typeof objectA !== "object" ||
    objectA === null ||
    typeof objectB !== "object" ||
    objectB === null
  ) {
    return false;
  }
  if (Array.isArray(objectA) !== Array.isArray(objectB)) return false;
  const keysA = Object.keys(objectA);
  const keysB = Object.keys(objectB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objectB, key)) return false;
    if (
      !isDeepEqual(
        (objectA as Record<string, unknown>)[key],
        (objectB as Record<string, unknown>)[key],
        depth + 1,
      )
    ) {
      return false;
    }
  }
  return true;
};

const getUnstableInfo = (
  fiber: Fiber,
): {
  unstableProps: string[];
  unstableFunctions: string[];
  unstableState: number[];
} => {
  const unstableProps: string[] = [];
  const unstableFunctions: string[] = [];
  const unstableState: number[] = [];

  if (!fiber.alternate) {
    return { unstableProps, unstableFunctions, unstableState };
  }

  traverseProps(fiber, (propName, nextValue, prevValue) => {
    if (Object.is(nextValue, prevValue)) return;
    if (propName === "children") return;

    if (typeof nextValue === "function" && typeof prevValue === "function") {
      if (nextValue.toString() === prevValue.toString()) {
        unstableFunctions.push(propName);
      }
    } else if (
      typeof nextValue === "object" &&
      nextValue !== null &&
      typeof prevValue === "object" &&
      prevValue !== null
    ) {
      if (isShallowEqual(nextValue, prevValue)) {
        unstableProps.push(`${propName} (shallow)`);
      } else if (isDeepEqual(nextValue, prevValue)) {
        unstableProps.push(`${propName} (deep)`);
      }
    }
  });

  let stateIndex = 0;
  traverseState(fiber, (nextState, prevState) => {
    const nextVal = nextState?.memoizedState;
    const prevVal = prevState?.memoizedState;
    if (!Object.is(nextVal, prevVal)) {
      if (
        typeof nextVal === "object" &&
        nextVal !== null &&
        typeof prevVal === "object" &&
        prevVal !== null
      ) {
        if (isShallowEqual(nextVal, prevVal) || isDeepEqual(nextVal, prevVal)) {
          unstableState.push(stateIndex);
        }
      }
    }
    stateIndex++;
  });

  return { unstableProps, unstableFunctions, unstableState };
};

const getFileName = (fiber: Fiber): string | null => {
  const debugSource = fiber._debugSource;
  if (!debugSource?.fileName) return null;
  const fullPath = debugSource.fileName;
  const parts = fullPath.split("/");
  return parts[parts.length - 1] || null;
};

const getChangeInfo = (
  fiber: Fiber,
): {
  reasons: string[];
  didPropsChange: boolean;
  didStateChange: boolean;
  didContextChange: boolean;
} => {
  const reasons: string[] = [];
  let didPropsChange = false;
  let didStateChange = false;
  let didContextChange = false;

  if (!fiber.alternate) {
    return { reasons, didPropsChange, didStateChange, didContextChange };
  }

  const changedProps: string[] = [];
  traverseProps(fiber, (propName, nextValue, prevValue) => {
    if (!Object.is(nextValue, prevValue)) {
      changedProps.push(propName);
    }
  });
  if (changedProps.length > 0) {
    didPropsChange = true;
    reasons.push(`props: ${changedProps.join(", ")}`);
  }

  const changedStateIndices: number[] = [];
  let stateIndex = 0;
  traverseState(fiber, (nextState, prevState) => {
    if (!Object.is(nextState?.memoizedState, prevState?.memoizedState)) {
      changedStateIndices.push(stateIndex);
    }
    stateIndex++;
  });
  if (changedStateIndices.length > 0) {
    didStateChange = true;
    reasons.push(`state: [${changedStateIndices.join(", ")}]`);
  }

  traverseContexts(fiber, (nextContext, prevContext) => {
    if (!Object.is(nextContext?.memoizedValue, prevContext?.memoizedValue)) {
      didContextChange = true;
      return true;
    }
  });
  if (didContextChange) {
    reasons.push("context");
  }

  return { reasons, didPropsChange, didStateChange, didContextChange };
};

const findRenderCause = (fiber: Fiber): RenderCause | null => {
  let currentFiber = fiber.return;
  let lastRenderedParent: Fiber | null = null;
  let propFromParent: string | null = null;

  const changedProps: string[] = [];
  traverseProps(fiber, (propName, nextValue, prevValue) => {
    if (!Object.is(nextValue, prevValue)) {
      changedProps.push(propName);
    }
  });
  if (changedProps.length > 0) {
    propFromParent = changedProps[0];
  }

  while (currentFiber) {
    if (!isCompositeFiber(currentFiber)) {
      currentFiber = currentFiber.return;
      continue;
    }

    const parentId = getFiberId(currentFiber);
    if (!fiberIdsRenderedInCommit.has(parentId)) {
      break;
    }

    lastRenderedParent = currentFiber;

    const parentChangeInfo = getChangeInfo(currentFiber);
    if (parentChangeInfo.didStateChange || parentChangeInfo.didContextChange) {
      return {
        componentName: getDisplayName(currentFiber.type) || "Unknown",
        prop: propFromParent,
      };
    }

    currentFiber = currentFiber.return;
  }

  if (lastRenderedParent) {
    return {
      componentName: getDisplayName(lastRenderedParent.type) || "Unknown",
      prop: propFromParent,
    };
  }

  return null;
};

const formatRenderLog = (
  fiber: Fiber,
  phase: string,
  displayName: string,
): string => {
  const fileName = getFileName(fiber);
  const { selfTime } = getTimings(fiber);
  const isCompiled = hasMemoCache(fiber);

  const compiledText = isCompiled ? " [react-compiler]" : "";
  const fileText = fileName ? ` (${fileName})` : "";

  if (phase === "unmount") {
    return `[${phase}] ${displayName}${compiledText}${fileText}`;
  }

  const changeInfo =
    phase === "update"
      ? getChangeInfo(fiber)
      : {
          reasons: [],
          didPropsChange: false,
          didStateChange: false,
          didContextChange: false,
        };

  const reasonText =
    changeInfo.reasons.length > 0
      ? ` { ${changeInfo.reasons.join(" | ")} }`
      : "";

  let causedByText = "";
  if (
    phase === "update" &&
    changeInfo.didPropsChange &&
    !changeInfo.didStateChange &&
    !changeInfo.didContextChange
  ) {
    const causedBy = findRenderCause(fiber);
    if (causedBy) {
      const propText = causedBy.prop ? `.${causedBy.prop}` : "";
      causedByText = ` ← ${causedBy.componentName}${propText}`;
    }
  }

  const timeText = selfTime > 0 ? ` ${selfTime.toFixed(2)}ms` : "";

  const warnings: string[] = [];
  if (phase === "update") {
    const unstableInfo = getUnstableInfo(fiber);
    if (unstableInfo.unstableFunctions.length > 0) {
      warnings.push(
        `unstable function: ${unstableInfo.unstableFunctions.join(", ")}`,
      );
    }
    if (unstableInfo.unstableProps.length > 0) {
      warnings.push(
        `unstable object: ${unstableInfo.unstableProps.join(", ")}`,
      );
    }
    if (unstableInfo.unstableState.length > 0) {
      warnings.push(
        `unstable state: [${unstableInfo.unstableState.join(", ")}]`,
      );
    }
  }
  const warningText = warnings.length > 0 ? ` ⚠️ ${warnings.join(", ")}` : "";

  return `[${phase}] ${displayName}${compiledText}${fileText}${reasonText}${causedByText}${timeText}${warningText}`;
};

const flushLogs = (entries: LogEntry[]): void => {
  const grouped = new Map<string, { count: number; totalTime: number }>();
  for (const entry of entries) {
    const existing = grouped.get(entry.message);
    if (existing) {
      existing.count++;
      existing.totalTime += entry.totalTime;
    } else {
      grouped.set(entry.message, { count: 1, totalTime: entry.totalTime });
    }
  }
  for (const [message, { count, totalTime }] of grouped) {
    const countSuffix = count > 1 ? ` x${count}` : "";
    const aggregateTime =
      count > 1 && totalTime > 0 ? ` (total: ${totalTime.toFixed(2)}ms)` : "";
    renderLogHistory.push(`${message}${countSuffix}${aggregateTime}`);
  }
  if (renderLogHistory.length > RENDER_SCAN_MAX_LOG_ENTRIES) {
    renderLogHistory = renderLogHistory.slice(-RENDER_SCAN_MAX_LOG_ENTRIES);
  }
};

const getCauseType = (fiber: Fiber): number => {
  if (!fiber.alternate) return CAUSE_TYPE_INITIAL;

  const changeInfo = getChangeInfo(fiber);
  if (changeInfo.didStateChange) return CAUSE_TYPE_STATE;
  if (changeInfo.didContextChange) return CAUSE_TYPE_CONTEXT;
  if (changeInfo.didPropsChange) return CAUSE_TYPE_PROPS;
  return CAUSE_TYPE_PARENT;
};

const getSourceFile = (fiber: Fiber): string | null => {
  const debugSource = fiber._debugSource;
  return debugSource?.fileName ?? null;
};

const getLineNumber = (fiber: Fiber): number => {
  const debugSource = fiber._debugSource;
  return debugSource?.lineNumber ?? 0;
};

const trackFiberRender = (fiber: Fiber, phase: string): void => {
  if (!isCompositeFiber(fiber)) return;

  const componentName =
    typeof fiber.type === "string" ? fiber.type : getDisplayName(fiber);
  if (!componentName) return;

  const fiberId = getFiberId(fiber);
  fiberIdsRenderedInCommit.add(fiberId);

  const existingRender = rendersInCurrentCommit.get(fiber);
  if (existingRender) {
    existingRender.renderCount++;
    return;
  }

  const { selfTime } = getTimings(fiber);
  const now = performance.now();

  recordActivity(
    ACTIVITY_TYPE_RENDER,
    now - selfTime,
    now,
    fiberId,
    componentName,
    getSourceFile(fiber),
    getLineNumber(fiber),
    selfTime,
    0,
    0,
    phase === "mount" ? RENDER_PHASE_MOUNT : RENDER_PHASE_UPDATE,
    getCauseType(fiber),
  );

  const hostFibers = getNearestHostFibers(fiber);
  rendersInCurrentCommit.set(fiber, {
    fiber,
    phase,
    componentName,
    renderCount: 1,
    domElements: hostFibers.map((hostFiber) => hostFiber.stateNode),
  });
};

interface EffectLike {
  tag: number;
  create: () => (() => void) | void;
  inst?: { destroy?: (() => void) | null };
  deps: unknown[] | null;
  next: EffectLike;
}

interface UpdateQueueLike {
  lastEffect: EffectLike | null;
}

const HOOK_PASSIVE_TAG = 8;
const HOOK_LAYOUT_TAG = 4;
const HOOK_INSERTION_TAG = 2;

const getEffectTypeFromTag = (tag: number): number => {
  if ((tag & HOOK_PASSIVE_TAG) !== 0) return EFFECT_TYPE_PASSIVE;
  if ((tag & HOOK_LAYOUT_TAG) !== 0) return EFFECT_TYPE_LAYOUT;
  if ((tag & HOOK_INSERTION_TAG) !== 0) return EFFECT_TYPE_INSERTION;
  return EFFECT_TYPE_PASSIVE;
};

const wrapEffectsInFiber = (fiber: Fiber): void => {
  const queue = fiber.updateQueue as UpdateQueueLike | null;
  if (!queue?.lastEffect) return;

  let effect = queue.lastEffect.next;
  const first = effect;

  do {
    if (wrappedEffects.has(effect)) {
      effect = effect.next;
      continue;
    }
    wrappedEffects.add(effect);

    const originalCreate = effect.create;
    const fiberId = getFiberId(fiber);
    const componentName = getDisplayName(fiber.type) || "Unknown";
    const sourceFile = getSourceFile(fiber);
    const lineNumber = getLineNumber(fiber);
    const effectType = getEffectTypeFromTag(effect.tag);

    effect.create = () => {
      const effectStartTime = performance.now();
      const effectResult = originalCreate();
      const effectEndTime = performance.now();
      const effectDuration = effectEndTime - effectStartTime;

      recordActivity(
        ACTIVITY_TYPE_EFFECT,
        effectStartTime,
        effectEndTime,
        fiberId,
        componentName,
        sourceFile,
        lineNumber,
        effectDuration,
        effectType,
        EFFECT_PHASE_CREATE,
        0,
        0,
      );

      if (typeof effectResult === "function") {
        const originalDestroy = effectResult;
        return () => {
          const destroyStartTime = performance.now();
          originalDestroy();
          const destroyEndTime = performance.now();
          const destroyDuration = destroyEndTime - destroyStartTime;

          recordActivity(
            ACTIVITY_TYPE_EFFECT,
            destroyStartTime,
            destroyEndTime,
            fiberId,
            componentName,
            sourceFile,
            lineNumber,
            destroyDuration,
            effectType,
            EFFECT_PHASE_DESTROY,
            0,
            0,
          );
        };
      }
      return effectResult;
    };

    effect = effect.next;
  } while (effect !== first);
};

const onCommitFiberRoot = (_rendererID: number, root: FiberRoot): void => {
  if (!isScanRecordingActive) return;

  fiberIdsRenderedInCommit.clear();
  rendersInCurrentCommit.clear();

  traverseRenderedFibers(root, (fiber, phase) => {
    trackFiberRender(fiber, phase);
    if (isCompositeFiber(fiber)) {
      wrapEffectsInFiber(fiber);
    }
  });

  if (rendersInCurrentCommit.size === 0) return;

  const renders = Array.from(rendersInCurrentCommit.values());

  const logEntries: LogEntry[] = renders.map((render) => {
    const { selfTime } = getTimings(render.fiber);
    return {
      message: formatRenderLog(
        render.fiber,
        render.phase,
        render.componentName,
      ),
      totalTime: selfTime,
    };
  });
  flushLogs(logEntries);

  renderCallback?.(renders);
};

const setupInstrumentation = (): boolean => {
  if (didInitializeInstrumentation) return true;
  if (!isInstrumentationActive()) return false;

  didInitializeInstrumentation = true;
  instrument({
    name: "react-grab-scan",
    onCommitFiberRoot,
  });
  return true;
};

const initialize = (): void => {
  if (didInitializeScanModule) return;
  didInitializeScanModule = true;

  if (loadPersistedState() && setupInstrumentation()) {
    isScanRecordingActive = true;
  }
};

export const startRecording = (): void => {
  if (!setupInstrumentation()) return;
  renderLogHistory = [];
  clearBuffer();
  recentLoAFs.length = 0;
  diagnosticSessionId = `session-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
  isScanRecordingActive = true;
  setupLoAFObserver();
  persistState(true);
};

export const stopRecording = (): void => {
  isScanRecordingActive = false;
  teardownLoAFObserver();
  persistState(false);
};

const generateSyntheticLoAFs = (): LoAFEntry[] => {
  const activityEntries = getAllEntries();
  if (activityEntries.length === 0) return [];

  const syntheticLoAFs: LoAFEntry[] = [];
  const sortedEntries = [...activityEntries].sort(
    (entryA, entryB) => entryA.startTime - entryB.startTime,
  );

  const FRAME_GAP_THRESHOLD_MS = 16;
  let currentWindowEntries: ActivityEntry[] = [];
  let windowStartTime = 0;

  for (const entry of sortedEntries) {
    if (currentWindowEntries.length === 0) {
      currentWindowEntries.push(entry);
      windowStartTime = entry.startTime;
    } else {
      const previousEntry =
        currentWindowEntries[currentWindowEntries.length - 1];
      const gapFromPrevious = entry.startTime - previousEntry.endTime;

      if (gapFromPrevious < FRAME_GAP_THRESHOLD_MS) {
        currentWindowEntries.push(entry);
      } else {
        const windowTotalTime = currentWindowEntries.reduce(
          (sum, innerEntry) => sum + innerEntry.selfTime,
          0,
        );
        if (windowTotalTime >= LOAF_THRESHOLD_MS) {
          const windowEndTime = Math.max(
            ...currentWindowEntries.map((innerEntry) => innerEntry.endTime),
          );
          syntheticLoAFs.push({
            startTime: windowStartTime,
            duration: windowEndTime - windowStartTime,
            blockingDuration: windowTotalTime,
            renderStart: windowStartTime,
            styleAndLayoutStart: windowEndTime,
            firstUIEventTimestamp: 0,
            scripts: [],
          });
        }
        currentWindowEntries = [entry];
        windowStartTime = entry.startTime;
      }
    }
  }

  if (currentWindowEntries.length > 0) {
    const windowTotalTime = currentWindowEntries.reduce(
      (sum, innerEntry) => sum + innerEntry.selfTime,
      0,
    );
    if (windowTotalTime >= LOAF_THRESHOLD_MS) {
      const windowEndTime = Math.max(
        ...currentWindowEntries.map((innerEntry) => innerEntry.endTime),
      );
      syntheticLoAFs.push({
        startTime: windowStartTime,
        duration: windowEndTime - windowStartTime,
        blockingDuration: windowTotalTime,
        renderStart: windowStartTime,
        styleAndLayoutStart: windowEndTime,
        firstUIEventTimestamp: 0,
        scripts: [],
      });
    }
  }

  return syntheticLoAFs;
};

const serializeDiagnostic = (diagnostic: PerformanceDiagnostic): string => {
  const serializable = {
    ...diagnostic,
    componentStats: Object.fromEntries(diagnostic.componentStats),
  };
  return JSON.stringify(serializable, null, 2);
};

interface AggregatedContributor {
  name: string;
  renderTimes: number[];
  effectTimes: number[];
  effectTypes: Set<string>;
  source: string | null;
}

interface AggregatedLoAF {
  indices: number[];
  avgDuration: number;
  contributors: AggregatedContributor[];
  unstableProps: string[];
}

const getEffectHookName = (effectType: string): string => {
  switch (effectType) {
    case "layout":
      return "useLayoutEffect";
    case "insertion":
      return "useInsertionEffect";
    default:
      return "useEffect";
  }
};

const formatSourceLocation = (
  filePath: string | undefined,
  lineNumber: number | null | undefined,
): string | null => {
  if (!filePath) return null;
  return lineNumber ? `${filePath}:${lineNumber}` : filePath;
};

const aggregateContributors = (
  frame: PerformanceFrame,
): AggregatedContributor[] => {
  const contributorsByName = new Map<string, AggregatedContributor>();
  const MIN_SIGNIFICANT_TIME_MS = 5;

  const significantContributors = frame.topContributors.filter(
    (contributor) => contributor.totalTime >= MIN_SIGNIFICANT_TIME_MS,
  );

  for (const contributor of significantContributors) {
    const componentName = contributor.component.displayName;
    const existingContributor = contributorsByName.get(componentName);
    const sourceLocation = formatSourceLocation(
      contributor.component.source?.filePath,
      contributor.component.source?.lineNumber,
    );

    if (existingContributor) {
      if (contributor.renderTime > 0) {
        existingContributor.renderTimes.push(
          Math.round(contributor.renderTime),
        );
      }
      if (contributor.effectTime > 0) {
        existingContributor.effectTimes.push(
          Math.round(contributor.effectTime),
        );
      }
      if (!existingContributor.source && sourceLocation) {
        existingContributor.source = sourceLocation;
      }
    } else {
      contributorsByName.set(componentName, {
        name: componentName,
        renderTimes:
          contributor.renderTime > 0
            ? [Math.round(contributor.renderTime)]
            : [],
        effectTimes:
          contributor.effectTime > 0
            ? [Math.round(contributor.effectTime)]
            : [],
        effectTypes: new Set<string>(),
        source: sourceLocation,
      });
    }
  }

  for (const effectExecution of frame.effects) {
    const componentName = effectExecution.component.displayName;
    const existingContributor = contributorsByName.get(componentName);
    if (existingContributor && effectExecution.duration > 0) {
      const effectHookName = getEffectHookName(effectExecution.effectType);
      existingContributor.effectTypes.add(effectHookName);

      if (
        !existingContributor.source &&
        effectExecution.component.source?.filePath
      ) {
        existingContributor.source = formatSourceLocation(
          effectExecution.component.source.filePath,
          effectExecution.component.source.lineNumber,
        );
      }
    }
  }

  return Array.from(contributorsByName.values()).sort(
    (contributorA, contributorB) => {
      const totalTimeA =
        contributorA.renderTimes.reduce((sum, time) => sum + time, 0) +
        contributorA.effectTimes.reduce((sum, time) => sum + time, 0);
      const totalTimeB =
        contributorB.renderTimes.reduce((sum, time) => sum + time, 0) +
        contributorB.effectTimes.reduce((sum, time) => sum + time, 0);
      return totalTimeB - totalTimeA;
    },
  );
};

const formatTimesCompact = (durations: number[]): string => {
  if (durations.length === 0) return "";

  const countByDuration = new Map<number, number>();
  for (const duration of durations) {
    if (duration === 0) continue;
    countByDuration.set(duration, (countByDuration.get(duration) || 0) + 1);
  }

  const formattedParts: string[] = [];
  const sortedDurations = Array.from(countByDuration.entries()).sort(
    ([durationA], [durationB]) => durationB - durationA,
  );
  for (const [duration, occurrences] of sortedDurations) {
    const durationStr =
      occurrences > 1 ? `${duration}ms x${occurrences}` : `${duration}ms`;
    formattedParts.push(durationStr);
  }
  return formattedParts.join(", ");
};

const formatContributorLine = (contributor: AggregatedContributor): string => {
  const timingParts: string[] = [];

  const renderTimingStr = formatTimesCompact(contributor.renderTimes);
  if (renderTimingStr) {
    timingParts.push(`render ${renderTimingStr}`);
  }

  const effectTimingStr = formatTimesCompact(contributor.effectTimes);
  if (effectTimingStr) {
    const effectTypeLabel =
      contributor.effectTypes.size > 0
        ? Array.from(contributor.effectTypes).join("/")
        : "effect";
    timingParts.push(`${effectTypeLabel} ${effectTimingStr}`);
  }

  return timingParts.join(", ");
};

const extractUnstableFromRenderLog = (
  relevantComponentNames: Set<string>,
): string[] => {
  const unstableReferences: string[] = [];
  const processedEntries = new Set<string>();

  for (const logLine of renderLogHistory) {
    if (!logLine.includes("unstable")) continue;

    const componentMatch = logLine.match(/^\[(?:mount|update)\]\s+(\w+)/);
    if (!componentMatch) continue;

    const componentName = componentMatch[1];
    if (!relevantComponentNames.has(componentName)) continue;

    const unstableMatch = logLine.match(/⚠️\s*(.+)$/);
    if (unstableMatch) {
      const unstableDescription = unstableMatch[1];
      const dedupeKey = `${componentName}:${unstableDescription}`;
      if (!processedEntries.has(dedupeKey)) {
        processedEntries.add(dedupeKey);
        const unstableParts = unstableDescription
          .split(",")
          .map((segment) => segment.trim());
        for (const unstablePart of unstableParts) {
          if (unstablePart.includes("unstable function:")) {
            const functionNames = unstablePart
              .replace("unstable function:", "")
              .trim();
            unstableReferences.push(`${componentName}.${functionNames} (fn)`);
          } else if (unstablePart.includes("unstable object:")) {
            const objectNames = unstablePart
              .replace("unstable object:", "")
              .replace("(shallow)", "")
              .trim();
            unstableReferences.push(`${componentName}.${objectNames} (obj)`);
          }
        }
      }
    }
  }
  return [...new Set(unstableReferences)];
};

const aggregateSimilarLoAFs = (
  frames: PerformanceFrame[],
): AggregatedLoAF[] => {
  const aggregatedGroups: AggregatedLoAF[] = [];
  const DURATION_SIMILARITY_THRESHOLD_MS = 30;
  let activeGroup: AggregatedLoAF | null = null;

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const frameContributors = aggregateContributors(frame);
    const frameContributorNames = new Set(
      frameContributors.map((contributor) => contributor.name),
    );
    const frameUnstableProps = extractUnstableFromRenderLog(
      frameContributorNames,
    );
    const frameDuration = Math.round(frame.loaf.duration);

    const frameContributorKey = frameContributors
      .map((contributor) => contributor.name)
      .sort()
      .join(",");
    const activeGroupContributorKey = activeGroup?.contributors
      .map((contributor) => contributor.name)
      .sort()
      .join(",");

    const isSimilarToActiveGroup =
      activeGroup &&
      frameContributorKey === activeGroupContributorKey &&
      Math.abs(frameDuration - activeGroup.avgDuration) <
        DURATION_SIMILARITY_THRESHOLD_MS;

    if (isSimilarToActiveGroup && activeGroup) {
      activeGroup.indices.push(frameIndex + 1);
      activeGroup.avgDuration = Math.round(
        (activeGroup.avgDuration * (activeGroup.indices.length - 1) +
          frameDuration) /
          activeGroup.indices.length,
      );
      for (const unstableProp of frameUnstableProps) {
        if (!activeGroup.unstableProps.includes(unstableProp)) {
          activeGroup.unstableProps.push(unstableProp);
        }
      }
    } else {
      if (activeGroup) {
        aggregatedGroups.push(activeGroup);
      }
      activeGroup = {
        indices: [frameIndex + 1],
        avgDuration: frameDuration,
        contributors: frameContributors,
        unstableProps: frameUnstableProps,
      };
    }
  }

  if (activeGroup) {
    aggregatedGroups.push(activeGroup);
  }
  return aggregatedGroups;
};

const formatLoAFGroupMarkdown = (loafGroup: AggregatedLoAF): string[] => {
  if (loafGroup.contributors.length === 0) {
    return [];
  }

  const MAX_CONTRIBUTORS_TO_SHOW = 5;
  const MAX_UNSTABLE_PROPS_TO_SHOW = 5;
  const markdownLines: string[] = [];

  const isSingleFrame = loafGroup.indices.length === 1;
  const indexLabel = isSingleFrame
    ? `#${loafGroup.indices[0]}`
    : `#${loafGroup.indices[0]}-${
        loafGroup.indices[loafGroup.indices.length - 1]
      }`;
  const durationLabel = isSingleFrame
    ? `${loafGroup.avgDuration}ms`
    : `~${loafGroup.avgDuration}ms`;

  markdownLines.push(`- **${indexLabel}** (${durationLabel})`);

  for (const contributor of loafGroup.contributors.slice(
    0,
    MAX_CONTRIBUTORS_TO_SHOW,
  )) {
    const timingStr = formatContributorLine(contributor);
    if (!timingStr) continue;
    const sourceStr = contributor.source ? ` \`${contributor.source}\`` : "";
    markdownLines.push(`  - \`${contributor.name}\` ${timingStr}${sourceStr}`);
  }

  if (loafGroup.unstableProps.length > 0) {
    const unstablePropsFormatted = loafGroup.unstableProps
      .slice(0, MAX_UNSTABLE_PROPS_TO_SHOW)
      .map((propName) => `\`${propName}\``)
      .join(", ");
    markdownLines.push(`  - *unstable:* ${unstablePropsFormatted}`);
  }

  return markdownLines;
};

export const copyRecording = async (): Promise<boolean> => {
  const diagnostic = getPerformanceDiagnostic();
  const { summary } = diagnostic;

  const aggregatedLoAFs = aggregateSimilarLoAFs(diagnostic.frames);
  const loafIssues = aggregatedLoAFs
    .filter((loafGroup) => loafGroup.contributors.length > 0)
    .flatMap(formatLoAFGroupMarkdown);

  const slowComponents: string[] = [];
  for (const [componentName, stats] of diagnostic.componentStats) {
    if (stats.totalRenderTime >= 10) {
      slowComponents.push(
        `| \`${componentName}\` | ${Math.round(stats.totalRenderTime)}ms | ${
          stats.renderCount
        } | ${Math.round(stats.maxRenderTime)}ms |`,
      );
    }
  }
  slowComponents.sort((lineA, lineB) => {
    const msA = parseInt(lineA.match(/\| (\d+)ms \|/)?.[1] || "0");
    const msB = parseInt(lineB.match(/\| (\d+)ms \|/)?.[1] || "0");
    return msB - msA;
  });

  const sections: string[] = [
    "# React Grab Diagnostic",
    "",
    `**${summary.totalLoAFs} LoAFs** | ${Math.round(
      summary.totalDuration,
    )}ms total | max ${Math.round(summary.maxLoAFDuration)}ms`,
    "",
  ];

  if (loafIssues.length > 0) {
    sections.push("## LoAF Issues", "", ...loafIssues, "");
  }

  if (slowComponents.length > 0) {
    sections.push(
      "## Slow Components",
      "",
      "| Component | Total | Renders | Max |",
      "|-----------|-------|---------|-----|",
      ...slowComponents.slice(0, 10),
      "",
    );
  }

  const markdownText = sections.join("\n");
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(markdownText);
    return true;
  }
  return false;
};

export const copyDiagnosticJson = async (): Promise<void> => {
  const diagnostic = getPerformanceDiagnostic();
  const json = serializeDiagnostic(diagnostic);
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(json);
  }
};

export const isScanAvailable = (): boolean => isInstrumentationActive();

export const isRecording = (): boolean => {
  initialize();
  return isScanRecordingActive;
};

export const getLogHistory = (): string[] => [...renderLogHistory];

export const hasLogHistory = (): boolean => renderLogHistory.length > 0;

export const clearLogHistory = (): void => {
  renderLogHistory = [];
};

export const setRenderCallback = (callback: RenderCallback | null): void => {
  renderCallback = callback;
};

const hydrateComponentIdentity = (entry: ActivityEntry): ComponentIdentity => {
  const componentName = getString(entry.componentNameIndex) || "Unknown";
  const sourceFile = getString(entry.sourceFileIndex);

  return {
    displayName: componentName,
    fiberId: entry.fiberId,
    source: sourceFile
      ? {
          filePath: sourceFile,
          lineNumber: entry.lineNumber || null,
          columnNumber: null,
          functionName: componentName,
        }
      : null,
    isCompiled: false,
    parentComponent: null,
  };
};

const getEffectTypeName = (
  effectType: number,
): "passive" | "layout" | "insertion" => {
  if (effectType === EFFECT_TYPE_LAYOUT) return "layout";
  if (effectType === EFFECT_TYPE_INSERTION) return "insertion";
  return "passive";
};

const getCauseTypeName = (
  causeType: number,
): "initial" | "props" | "state" | "context" | "parent" => {
  switch (causeType) {
    case CAUSE_TYPE_PROPS:
      return "props";
    case CAUSE_TYPE_STATE:
      return "state";
    case CAUSE_TYPE_CONTEXT:
      return "context";
    case CAUSE_TYPE_PARENT:
      return "parent";
    default:
      return "initial";
  }
};

const hydrateRenderEntry = (
  entry: ActivityEntry,
  loaf: LoAFEntry | null,
): RenderExecution => ({
  component: hydrateComponentIdentity(entry),
  phase: entry.renderPhase === RENDER_PHASE_MOUNT ? "mount" : "update",
  startTime: entry.startTime,
  selfTime: entry.selfTime,
  totalTime: entry.selfTime,
  renderCause: {
    type: getCauseTypeName(entry.causeType),
    propChanges: [],
  },
  optimizationHints: [],
  containingLoAF: loaf,
});

const hydrateEffectEntry = (
  entry: ActivityEntry,
  loaf: LoAFEntry | null,
): EffectExecution => ({
  component: hydrateComponentIdentity(entry),
  effectType: getEffectTypeName(entry.effectType),
  phase: entry.effectPhase === EFFECT_PHASE_CREATE ? "create" : "destroy",
  startTime: entry.startTime,
  duration: entry.selfTime,
  effectSource: null,
  containingLoAF: loaf,
});

const calculateBreakdown = (
  loaf: LoAFEntry,
  renders: ActivityEntry[],
  effects: ActivityEntry[],
): PerformanceFrameBreakdown => {
  const renderTime = renders.reduce((sum, r) => sum + r.selfTime, 0);
  const effectTime = effects.reduce((sum, e) => sum + e.selfTime, 0);
  const layoutEffectTime = effects
    .filter((e) => e.effectType === EFFECT_TYPE_LAYOUT)
    .reduce((sum, e) => sum + e.selfTime, 0);
  const forcedLayoutTime = loaf.scripts.reduce(
    (sum, s) => sum + s.forcedStyleAndLayoutDuration,
    0,
  );

  return {
    totalDuration: loaf.duration,
    reactRenderTime: renderTime,
    effectTime: effectTime,
    layoutEffectTime: layoutEffectTime,
    forcedLayoutTime: forcedLayoutTime,
    otherScriptTime: Math.max(0, loaf.duration - renderTime - effectTime),
  };
};

const findTopContributors = (
  renders: ActivityEntry[],
  effects: ActivityEntry[],
): PerformanceFrameContributor[] => {
  const byComponent = new Map<
    number,
    {
      component: ComponentIdentity;
      renderTime: number;
      effectTime: number;
      renderCount: number;
    }
  >();

  for (const render of renders) {
    const existing = byComponent.get(render.fiberId);
    if (existing) {
      existing.renderTime += render.selfTime;
      existing.renderCount++;
    } else {
      byComponent.set(render.fiberId, {
        component: hydrateComponentIdentity(render),
        renderTime: render.selfTime,
        effectTime: 0,
        renderCount: 1,
      });
    }
  }

  for (const effect of effects) {
    const existing = byComponent.get(effect.fiberId);
    if (existing) {
      existing.effectTime += effect.selfTime;
    } else {
      byComponent.set(effect.fiberId, {
        component: hydrateComponentIdentity(effect),
        renderTime: 0,
        effectTime: effect.selfTime,
        renderCount: 0,
      });
    }
  }

  return Array.from(byComponent.values())
    .map((c) => ({
      component: c.component,
      totalTime: c.renderTime + c.effectTime,
      renderTime: c.renderTime,
      effectTime: c.effectTime,
      renderCount: c.renderCount,
    }))
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 10);
};

const aggregateByComponent = (
  frames: PerformanceFrame[],
): Map<string, ComponentStats> => {
  const stats = new Map<string, ComponentStats>();

  for (const frame of frames) {
    for (const render of frame.renders) {
      const key = render.component.displayName;
      const existing = stats.get(key);

      if (existing) {
        existing.renderCount++;
        existing.totalRenderTime += render.selfTime;
        existing.maxRenderTime = Math.max(
          existing.maxRenderTime,
          render.selfTime,
        );
        existing.avgRenderTime =
          existing.totalRenderTime / existing.renderCount;
        existing.loafsContributed++;
      } else {
        stats.set(key, {
          component: render.component,
          renderCount: 1,
          totalRenderTime: render.selfTime,
          avgRenderTime: render.selfTime,
          maxRenderTime: render.selfTime,
          effectCount: 0,
          totalEffectTime: 0,
          avgEffectTime: 0,
          loafsContributed: 1,
          topRenderCauses: [],
          allOptimizationHints: [],
        });
      }
    }

    for (const effect of frame.effects) {
      const key = effect.component.displayName;
      const existing = stats.get(key);

      if (existing) {
        existing.effectCount++;
        existing.totalEffectTime += effect.duration;
        existing.avgEffectTime =
          existing.totalEffectTime / existing.effectCount;
      } else {
        stats.set(key, {
          component: effect.component,
          renderCount: 0,
          totalRenderTime: 0,
          avgRenderTime: 0,
          maxRenderTime: 0,
          effectCount: 1,
          totalEffectTime: effect.duration,
          avgEffectTime: effect.duration,
          loafsContributed: 1,
          topRenderCauses: [],
          allOptimizationHints: [],
        });
      }
    }
  }

  return stats;
};

const generateRecommendations = (
  componentStats: Map<string, ComponentStats>,
): PerformanceRecommendation[] => {
  const recommendations: PerformanceRecommendation[] = [];
  const SLOW_RENDER_THRESHOLD_MS = 16;
  const VERY_SLOW_RENDER_THRESHOLD_MS = 50;
  const SLOW_EFFECT_THRESHOLD_MS = 10;
  const VERY_SLOW_EFFECT_THRESHOLD_MS = 30;
  const MIN_OCCURRENCES_FOR_RECOMMENDATION = 2;

  for (const [componentName, stats] of componentStats) {
    const hasSlowRenders =
      stats.maxRenderTime > SLOW_RENDER_THRESHOLD_MS &&
      stats.renderCount >= MIN_OCCURRENCES_FOR_RECOMMENDATION;

    if (hasSlowRenders) {
      const isVerySlow = stats.maxRenderTime > VERY_SLOW_RENDER_THRESHOLD_MS;
      recommendations.push({
        priority: isVerySlow ? 1 : 2,
        component: stats.component,
        issue: `Component renders slowly (max ${stats.maxRenderTime.toFixed(
          1,
        )}ms)`,
        impact: `~${stats.avgRenderTime.toFixed(1)}ms saved per render`,
        fix: {
          type: "add-memo",
          description: `Consider memoizing ${componentName} with React.memo()`,
          codeExample: `const ${componentName} = React.memo(function ${componentName}(props) {\n  // ...\n});`,
          affectedFile: stats.component.source?.filePath || "",
          affectedLines: [
            stats.component.source?.lineNumber || 0,
            stats.component.source?.lineNumber || 0,
          ],
        },
        evidence: {
          occurrences: stats.renderCount,
          avgTimeWasted: stats.avgRenderTime,
          worstCaseTime: stats.maxRenderTime,
          sampleTimestamps: [],
        },
      });
    }

    const hasSlowEffects =
      stats.avgEffectTime > SLOW_EFFECT_THRESHOLD_MS &&
      stats.effectCount >= MIN_OCCURRENCES_FOR_RECOMMENDATION;

    if (hasSlowEffects) {
      const isVerySlow = stats.avgEffectTime > VERY_SLOW_EFFECT_THRESHOLD_MS;
      recommendations.push({
        priority: isVerySlow ? 1 : 3,
        component: stats.component,
        issue: `Effect runs slowly (avg ${stats.avgEffectTime.toFixed(1)}ms)`,
        impact: `~${stats.avgEffectTime.toFixed(1)}ms saved per effect`,
        fix: {
          type: "optimize-effect",
          description: `Optimize or debounce effect in ${componentName}`,
          codeExample: `useEffect(() => {\n  // Consider debouncing or batching\n}, [deps]);`,
          affectedFile: stats.component.source?.filePath || "",
          affectedLines: [
            stats.component.source?.lineNumber || 0,
            stats.component.source?.lineNumber || 0,
          ],
        },
        evidence: {
          occurrences: stats.effectCount,
          avgTimeWasted: stats.avgEffectTime,
          worstCaseTime: stats.avgEffectTime,
          sampleTimestamps: [],
        },
      });
    }
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
};

export const getPerformanceDiagnostic = (): PerformanceDiagnostic => {
  const frames: PerformanceFrame[] = [];
  const loafsToProcess =
    recentLoAFs.length > 0 ? recentLoAFs : generateSyntheticLoAFs();

  for (const loaf of loafsToProcess) {
    const windowStart = loaf.startTime;
    const windowEnd = loaf.startTime + loaf.duration;

    const entries = getEntriesInWindow(windowStart, windowEnd);
    const renderEntries = entries.filter(
      (e) => e.type === ACTIVITY_TYPE_RENDER,
    );
    const effectEntries = entries.filter(
      (e) => e.type === ACTIVITY_TYPE_EFFECT,
    );

    frames.push({
      loaf,
      renders: renderEntries.map((e) => hydrateRenderEntry(e, loaf)),
      effects: effectEntries.map((e) => hydrateEffectEntry(e, loaf)),
      breakdown: calculateBreakdown(loaf, renderEntries, effectEntries),
      topContributors: findTopContributors(renderEntries, effectEntries),
    });
  }

  const componentStats = aggregateByComponent(frames);

  const summary: PerformanceDiagnosticSummary = {
    totalLoAFs: frames.length,
    totalDuration: frames.reduce((sum, f) => sum + f.loaf.duration, 0),
    avgLoAFDuration:
      frames.length > 0
        ? frames.reduce((sum, f) => sum + f.loaf.duration, 0) / frames.length
        : 0,
    maxLoAFDuration:
      frames.length > 0 ? Math.max(...frames.map((f) => f.loaf.duration)) : 0,
    totalRenders: frames.reduce((sum, f) => sum + f.renders.length, 0),
    totalEffects: frames.reduce((sum, f) => sum + f.effects.length, 0),
    totalForcedLayouts: frames.reduce(
      (sum, f) =>
        sum +
        f.loaf.scripts.filter((s) => s.forcedStyleAndLayoutDuration > 0).length,
      0,
    ),
  };

  return {
    timestamp: Date.now(),
    sessionId: diagnosticSessionId,
    summary,
    frames,
    componentStats,
    recommendations: generateRecommendations(componentStats),
  };
};

export const getRecentLoAFs = (): LoAFEntry[] => [...recentLoAFs];

export const isLoAFAvailable = (): boolean => isLoAFSupported();

export type { PendingRender };
