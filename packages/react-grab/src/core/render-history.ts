// Continuously records what changed on every React commit so the time-travel
// panel can replay a component's recent history. This piggybacks on bippy's
// commit instrumentation (the same devtools hook react-grab already relies on
// for source resolution and freezing) and keeps a bounded ring buffer so a
// long-lived, busy app never grows this unbounded.
import {
  getDisplayName,
  getFiberId,
  instrument,
  isCompositeFiber,
  traverseProps,
  traverseRenderedFibers,
  traverseState,
  type Fiber,
  type FiberRoot,
} from "bippy";
import {
  HISTORY_MAX_CHANGES_PER_FIBER,
  HISTORY_MAX_ENTRIES,
  HISTORY_MAX_FIBERS_PER_ENTRY,
} from "../constants.js";
import type { HistoryChange, HistoryEntry, HistoryFiberChange } from "../types.js";
import { formatHistoryValue } from "../utils/format-history-value.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";

const entries: HistoryEntry[] = [];
let nextEntryId = 1;
let isInstrumented = false;
let isRecording = false;

// Mutated per-commit by the stable onRender handler below. Kept at module scope
// so the handler stays a single monomorphic function (no per-commit closure).
let pendingFibers: HistoryFiberChange[] = [];

const captureFiberChanges = (fiber: Fiber): HistoryChange[] => {
  const changes: HistoryChange[] = [];

  traverseProps(fiber, (propName, nextValue, prevValue) => {
    if (changes.length >= HISTORY_MAX_CHANGES_PER_FIBER) return true;
    if (propName === "children") return;
    if (Object.is(nextValue, prevValue)) return;
    changes.push({
      kind: "props",
      label: propName,
      prev: formatHistoryValue(prevValue),
      next: formatHistoryValue(nextValue),
    });
  });

  // Only useState/useReducer hooks carry an update `queue`; useMemo/useRef/
  // useEffect nodes don't. Filtering on it isolates real state transitions from
  // the effect/memo churn that changes identity on every render.
  let stateIndex = 0;
  traverseState(fiber, (nextNode, prevNode) => {
    if (changes.length >= HISTORY_MAX_CHANGES_PER_FIBER) return true;
    if (!nextNode || nextNode.queue == null) return;
    const currentStateIndex = stateIndex;
    stateIndex += 1;
    if (!prevNode) return;
    if (Object.is(nextNode.memoizedState, prevNode.memoizedState)) return;
    changes.push({
      kind: "state",
      label: `state ${currentStateIndex}`,
      prev: formatHistoryValue(prevNode.memoizedState),
      next: formatHistoryValue(nextNode.memoizedState),
    });
  });

  return changes;
};

const onRender = (fiber: Fiber, phase: string): void => {
  if (phase !== "update") return;
  if (pendingFibers.length >= HISTORY_MAX_FIBERS_PER_ENTRY) return;
  if (!isCompositeFiber(fiber)) return;
  const changes = captureFiberChanges(fiber);
  if (changes.length === 0) return;
  pendingFibers.push({
    fiberId: getFiberId(fiber),
    displayName: getDisplayName(fiber.type) ?? "Unknown",
    changes,
  });
};

const onCommitFiberRoot = (_rendererID: number, root: FiberRoot): void => {
  if (!isRecording) return;
  pendingFibers = [];
  try {
    traverseRenderedFibers(root, onRender);
  } catch (error) {
    logRecoverableError("render-history traversal failed", error);
    return;
  }
  if (pendingFibers.length === 0) return;
  entries.push({ id: nextEntryId++, timestamp: Date.now(), fibers: pendingFibers });
  if (entries.length > HISTORY_MAX_ENTRIES) {
    entries.splice(0, entries.length - HISTORY_MAX_ENTRIES);
  }
};

export const startRenderHistory = (): void => {
  isRecording = true;
  if (isInstrumented) return;
  isInstrumented = true;
  try {
    instrument({ name: "react-grab-history", onCommitFiberRoot });
  } catch (error) {
    logRecoverableError("render-history instrumentation failed", error);
  }
};

export const stopRenderHistory = (): void => {
  isRecording = false;
};

export const getRenderHistoryEntries = (): readonly HistoryEntry[] => entries;

export const clearRenderHistory = (): void => {
  entries.length = 0;
};
