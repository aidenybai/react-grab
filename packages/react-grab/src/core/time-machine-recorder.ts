// There is no public React API to read or rewrite past state. The recorder
// observes every state change through bippy's commit instrumentation
// (onCommitFiberRoot) and diffs each rendered fiber's hook list against its
// alternate, storing both the previous and next value of every changed
// stateful hook so the timeline can be replayed in either direction like an
// undo/redo log. Restoring does NOT use React DevTools' overrideHookState:
// when React Refresh (Vite/Next dev) creates the DevTools hook before bippy
// loads, the injected renderer object is never retained anywhere reachable,
// so the bridge is unavailable exactly where react-grab runs most. Instead:
//
// - useState-family hooks replay through their own queue.dispatch — the
//   stable setState dispatcher React stores on the hook queue — which is
//   exact because basicStateReducer invokes a function action with the
//   current state (dispatching `() => value` always lands on value).
// - useReducer hooks cannot be forced through dispatch (actions feed the
//   app's reducer), so travel writes the hook's memoizedState/baseState
//   directly on both the fiber and its alternate — making the resulting
//   commit diff-invisible — and then forces the component to re-render by
//   "wiggling" the nearest useState queue (a sentinel dispatch immediately
//   superseded by the current value, netting zero).
// - useSyncExternalStore is deliberately NOT tracked: its state lives in an
//   external store with no generic setter, and React's consistency check
//   re-reads getSnapshot() after every render, immediately reverting any
//   forced hook value — so its changes are neither recorded nor restored.
import {
  ForwardRefTag,
  FunctionComponentTag,
  SimpleMemoComponentTag,
  getDisplayName,
  getLatestFiber,
  instrument,
  secure,
  traverseRenderedFibers,
  type Fiber,
  type FiberRoot,
  type MemoizedState,
  type RenderPhase,
} from "bippy";
import {
  TIME_MACHINE_COALESCE_WINDOW_MS,
  TIME_MACHINE_INPUT_ATTRIBUTION_WINDOW_MS,
  TIME_MACHINE_MAX_ENTRIES,
  TIME_MACHINE_SETTLE_COALESCE_WINDOW_MS,
  TIME_MACHINE_TRAVEL_EXPECTATION_TTL_MS,
} from "../constants.js";
import type { TimeMachineTimelineEntry } from "../types.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { releaseAnimationClock, syncAnimationClock } from "./time-machine-animation-clock.js";
import {
  freezePageClock,
  installPageClockInterception,
  releasePageClock,
} from "./time-machine-page-clock.js";
import {
  applyInteractionSnapshot,
  captureInteractionSnapshot,
  releaseInteractionPins,
  type TimeMachineInteractionSnapshot,
} from "./time-machine-interaction-snapshot.js";

interface RestorableHookQueue {
  dispatch: (action: unknown) => void;
  lastRenderedReducer?: unknown;
  lastRenderedState?: unknown;
}

type RestorableHookKind = "state" | "reducer";

interface TimeMachineHookChange {
  kind: RestorableHookKind;
  queueRef: WeakRef<RestorableHookQueue>;
  fiberRef: WeakRef<Fiber>;
  previousValue: unknown;
  nextValue: unknown;
}

interface TimeMachineEntry {
  id: number;
  componentName: string;
  changes: TimeMachineHookChange[];
  timestamp: number;
  interactionSnapshot: TimeMachineInteractionSnapshot | null;
}

// Only useState-family hooks are exactly restorable via a function action;
// useReducer hooks feed the app's own reducer and cannot be forced to an
// arbitrary state. Dev builds of React expose the distinction through this
// internal function name.
const BASIC_STATE_REDUCER_NAME = "basicStateReducer";

interface StateReducer {
  (state: unknown, action: unknown): unknown;
}

const isStateReducerFunction = (value: unknown): value is StateReducer =>
  typeof value === "function";

const PROBE_CURRENT_STATE = Object.freeze({});
const PROBE_NEXT_STATE = Object.freeze({});
const reducerRestorabilityCache = new WeakMap<StateReducer, boolean>();

// Production React minifies basicStateReducer's name, so the reducer is
// probed behaviorally instead: only a useState-style reducer maps a function
// action to that function applied to the current state. Reducers must be
// pure, and the probe runs once per distinct reducer function.
const isRestorableStateReducer = (reducer: StateReducer): boolean => {
  if (reducer.name === BASIC_STATE_REDUCER_NAME) return true;
  const cachedResult = reducerRestorabilityCache.get(reducer);
  if (cachedResult !== undefined) return cachedResult;
  let isRestorable = false;
  try {
    isRestorable = reducer(PROBE_CURRENT_STATE, () => PROBE_NEXT_STATE) === PROBE_NEXT_STATE;
  } catch {
    isRestorable = false;
  }
  reducerRestorabilityCache.set(reducer, isRestorable);
  return isRestorable;
};

let isRecording = false;
let isInstrumented = false;
let isPanelOpen = false;
let nextEntryId = 0;
let history: TimeMachineEntry[] = [];
let travelCursor = 0;
let lastUserInputAtMs = 0;
const historyListeners = new Set<() => void>();

interface TravelExpectation {
  value: unknown;
  dispatchedAt: number;
}

// Travel dispatches cause real commits that would otherwise be re-recorded
// as new history (and truncate the redo tail). Each travelled queue maps to
// the ordered list of values it is expected to land on — a list, not a single
// value, because rapid scrubbing can dispatch several steps before React
// commits the first one, and those steps may flush as one batched commit or
// as several. The commit diff consumes expectations up to the matching value;
// a mismatching diff clears them all and is recorded as a real change. When
// values repeat (boolean toggles) a batched flush is indistinguishable from a
// sequential one by value alone and can leave residue, so expectations also
// expire after a TTL — travel commits flush within milliseconds of their
// dispatch, so anything older belongs to a flush that already happened.
let pendingTravelValues = new WeakMap<RestorableHookQueue, TravelExpectation[]>();

const dropExpiredExpectations = (
  queue: RestorableHookQueue,
  expectations: TravelExpectation[],
): TravelExpectation[] | null => {
  const expiryThreshold = Date.now() - TIME_MACHINE_TRAVEL_EXPECTATION_TTL_MS;
  while (expectations.length > 0 && expectations[0].dispatchedAt < expiryThreshold) {
    expectations.shift();
  }
  if (expectations.length === 0) {
    pendingTravelValues.delete(queue);
    return null;
  }
  return expectations;
};

const notifyHistoryChange = (): void => {
  for (const listener of historyListeners) {
    listener();
  }
};

const isHookStatefulFiber = (fiber: Fiber): boolean =>
  fiber.tag === FunctionComponentTag ||
  fiber.tag === ForwardRefTag ||
  fiber.tag === SimpleMemoComponentTag;

interface RestorableHookTarget {
  queue: RestorableHookQueue;
  kind: RestorableHookKind;
}

// Requiring lastRenderedReducer scopes tracking to useState/useReducer:
// useSyncExternalStore's queue carries a getSnapshot instead (its state lives
// in an external store that cannot be written back), and useActionState's
// queue carries the action — neither is recordable-and-restorable.
const getRestorableHookTarget = (hookNode: MemoizedState): RestorableHookTarget | null => {
  const queue: unknown = hookNode.queue;
  if (typeof queue !== "object" || queue === null) return null;
  if (!("dispatch" in queue) || typeof queue.dispatch !== "function") return null;
  if (!("lastRenderedReducer" in queue)) return null;
  const reducer = queue.lastRenderedReducer;
  if (!isStateReducerFunction(reducer)) return null;
  return {
    queue: queue as RestorableHookQueue,
    kind: isRestorableStateReducer(reducer) ? "state" : "reducer",
  };
};

// Hooks live on fiber.memoizedState as a linked list; walking the current and
// alternate lists in lockstep pairs each hook with its previous render's
// value, so no separate baseline bookkeeping is needed.
const collectHookChanges = (fiber: Fiber): TimeMachineHookChange[] | null => {
  const alternate = fiber.alternate;
  if (!alternate) return null;
  let changes: TimeMachineHookChange[] | null = null;
  let currentHook: MemoizedState | null = fiber.memoizedState;
  let previousHook: MemoizedState | null = alternate.memoizedState;
  while (currentHook && previousHook && typeof currentHook === "object") {
    const target = getRestorableHookTarget(currentHook);
    if (target) {
      if (!Object.is(currentHook.memoizedState, previousHook.memoizedState)) {
        if (!consumeTravelExpectation(target.queue, currentHook.memoizedState)) {
          changes ??= [];
          changes.push({
            kind: target.kind,
            queueRef: new WeakRef(target.queue),
            fiberRef: new WeakRef(fiber),
            previousValue: previousHook.memoizedState,
            nextValue: currentHook.memoizedState,
          });
        }
      } else {
        settleTravelExpectations(target.queue, currentHook.memoizedState);
      }
    }
    currentHook = currentHook.next;
    previousHook = previousHook.next;
  }
  return changes;
};

// A scrub that returns to the origin value nets out to a render with no
// state diff, which would strand its expectations; once the committed value
// matches the last expected value the whole batch has flushed.
const settleTravelExpectations = (queue: RestorableHookQueue, committedValue: unknown): void => {
  const expectations = pendingTravelValues.get(queue);
  if (!expectations) return;
  const liveExpectations = dropExpiredExpectations(queue, expectations);
  if (!liveExpectations) return;
  if (Object.is(liveExpectations[liveExpectations.length - 1].value, committedValue)) {
    pendingTravelValues.delete(queue);
  }
};

// Returns true when the committed value belongs to an in-flight travel batch.
// React batches all dispatches from one travelTo call into a single commit
// landing on the final value, so the LAST matching occurrence is the right
// anchor when values repeat (boolean toggles): everything up to it was
// superseded within the same flush. A mismatching diff is a real change and
// clears the queue's expectations entirely.
const consumeTravelExpectation = (queue: RestorableHookQueue, committedValue: unknown): boolean => {
  const expectations = pendingTravelValues.get(queue);
  if (!expectations) return false;
  const liveExpectations = dropExpiredExpectations(queue, expectations);
  if (!liveExpectations) return false;
  const matchIndex = liveExpectations.findLastIndex((expectation) =>
    Object.is(expectation.value, committedValue),
  );
  if (matchIndex === -1) {
    pendingTravelValues.delete(queue);
    return false;
  }
  liveExpectations.splice(0, matchIndex + 1);
  if (liveExpectations.length === 0) {
    pendingTravelValues.delete(queue);
  }
  return true;
};

// A settling commit only touches hook queues the previous entry already
// changed: an animation/transition finishing what that entry started, never
// a new interaction (which would involve at least one fresh queue).
const areAllQueuesInEntry = (
  entry: TimeMachineEntry,
  changes: TimeMachineHookChange[],
): boolean => {
  for (const newChange of changes) {
    const newQueue = newChange.queueRef.deref();
    if (!newQueue) continue;
    const isKnownQueue = entry.changes.some((change) => change.queueRef.deref() === newQueue);
    if (!isKnownQueue) return false;
  }
  return true;
};

// Animation-driven state (text scrambles, count-ups, springs) commits on
// every tick, often spread across many small component instances (one per
// text grapheme is common). Recording each tick would fill the timeline with
// transient mid-animation frames, and scrubbing onto one restores garbled
// intermediate state (e.g. a text morph showing both the old and new text).
// Two coalescing tiers fold such commits into the previous entry — a short
// unconditional window for burst ticks, and a longer queue-keyed window for
// the delayed cleanup commit that ends a transition. Per queue, previousValue
// stays the settled state before the burst and nextValue tracks the latest,
// so a whole burst scrubs as one step between two "settled moments".
const tryCoalesceIntoLastEntry = (changes: TimeMachineHookChange[], now: number): boolean => {
  if (travelCursor !== history.length) return false;
  // A commit right after a pointer/keyboard event is user-driven and must
  // stay its own scrub step — two quick clicks on the same toggle are two
  // moments, not one burst.
  if (now - lastUserInputAtMs <= TIME_MACHINE_INPUT_ATTRIBUTION_WINDOW_MS) return false;
  const lastEntry = history[history.length - 1];
  if (!lastEntry) return false;
  const elapsedMs = now - lastEntry.timestamp;
  if (elapsedMs > TIME_MACHINE_SETTLE_COALESCE_WINDOW_MS) return false;
  if (elapsedMs > TIME_MACHINE_COALESCE_WINDOW_MS && !areAllQueuesInEntry(lastEntry, changes)) {
    return false;
  }

  for (const newChange of changes) {
    const newQueue = newChange.queueRef.deref();
    const existingChange = newQueue
      ? lastEntry.changes.find((change) => change.queueRef.deref() === newQueue)
      : undefined;
    if (existingChange) {
      existingChange.nextValue = newChange.nextValue;
    } else {
      lastEntry.changes.push(newChange);
    }
  }
  lastEntry.timestamp = now;
  return true;
};

const recordEntry = (componentName: string, changes: TimeMachineHookChange[]): void => {
  if (travelCursor < history.length) {
    // While the panel is open, background app activity (timers, network)
    // must not destroy the part of the timeline the user is scrubbing
    // through, so rewound recording drops instead of forking. The dropped
    // change is not lost state-consistency-wise: travel dispatches absolute
    // recorded values (never deltas), so continuing to scrub snaps every
    // recorded hook exactly back onto the timeline regardless of any drift
    // that happened in between.
    if (isPanelOpen) return;
    // Recording while rewound forks the timeline: the undone tail is dropped
    // so the new change becomes the latest point in history (classic
    // undo/redo semantics).
    history.length = travelCursor;
  }
  const now = Date.now();
  if (tryCoalesceIntoLastEntry(changes, now)) {
    notifyHistoryChange();
    return;
  }
  history.push({
    id: nextEntryId++,
    componentName,
    changes,
    timestamp: now,
    interactionSnapshot: captureInteractionSnapshot(),
  });
  if (history.length > TIME_MACHINE_MAX_ENTRIES) {
    history.splice(0, history.length - TIME_MACHINE_MAX_ENTRIES);
  }
  travelCursor = history.length;
  notifyHistoryChange();
};

// All hook changes within one commit accumulate into a single timeline entry:
// React batches state updates across components, and splitting a batch into
// per-fiber steps would let the scrubber land on combined states that never
// existed in the real app.
let commitChanges: TimeMachineHookChange[] | null = null;
let commitComponentName: string | null = null;

const handleRenderedFiber = (fiber: Fiber, phase: RenderPhase): void => {
  if (phase !== "update") return;
  if (!isHookStatefulFiber(fiber)) return;
  const changes = collectHookChanges(fiber);
  if (!changes) return;
  if (commitChanges) {
    commitChanges.push(...changes);
  } else {
    commitChanges = changes;
    commitComponentName = getDisplayName(fiber.type) ?? "Anonymous";
  }
};

const handleCommitFiberRoot = (_rendererId: number, root: FiberRoot): void => {
  if (!isRecording) return;
  try {
    commitChanges = null;
    commitComponentName = null;
    traverseRenderedFibers(root, handleRenderedFiber);
    if (commitChanges) {
      recordEntry(commitComponentName ?? "Anonymous", commitChanges);
    }
  } catch (error) {
    logRecoverableError("Time machine failed to record commit", error);
  } finally {
    commitChanges = null;
    commitComponentName = null;
  }
};

const markUserInput = (): void => {
  lastUserInputAtMs = Date.now();
};

const USER_INPUT_EVENTS = ["pointerdown", "pointerup", "keydown"] as const;

export const startTimeMachineRecorder = (): void => {
  isRecording = true;
  if (isInstrumented) return;
  isInstrumented = true;
  // Passive capture listeners so coalescing can tell user-driven commits
  // (which must stay distinct scrub steps) apart from ambient animation and
  // timer commits. Never removed: instrument() below is also permanent, and
  // a timestamp write per interaction is free.
  for (const eventType of USER_INPUT_EVENTS) {
    window.addEventListener(eventType, markUserInput, { capture: true, passive: true });
  }
  // The scheduler wrappers only see timers created after they install, so
  // installation happens now — before the app's effects register their
  // interval tickers — not lazily at the first rewind.
  installPageClockInterception();
  instrument(
    secure(
      { onCommitFiberRoot: handleCommitFiberRoot },
      {
        // react-grab intentionally runs against production React builds
        // (e.g. the react-grab website itself); without this flag, secure()
        // silently uninstalls the commit handler there and no history is
        // ever recorded.
        dangerouslyRunInProduction: true,
        onError: (error) => logRecoverableError("Time machine instrumentation failed", error),
      },
    ),
  );
};

// bippy's instrument() cannot be uninstalled, so stopping flips the recording
// flag off and drops the timeline; the commit handler stays as a no-op.
// Travel expectations are dropped too: with recording off, the commits that
// would consume them are never diffed, and a leftover expectation could
// swallow a real change after a restart.
export const stopTimeMachineRecorder = (): void => {
  isRecording = false;
  history = [];
  travelCursor = 0;
  pendingTravelValues = new WeakMap();
  notifyHistoryChange();
};

// Closing the panel keeps the travelled state but lets time flow again — a
// page whose animations stay frozen (or hover styles stay pinned) after the
// scrubber is gone reads as broken, not as time-travelled. Reopening while
// the cursor still sits in the past re-enters the frozen-time regime.
export const setTimeMachinePanelOpen = (isOpen: boolean): void => {
  isPanelOpen = isOpen;
  if (isOpen) {
    syncTimeFreezeToCursor();
  } else {
    releasePageClock();
    releaseAnimationClock();
    releaseInteractionPins();
  }
};

export const subscribeToTimeMachineHistory = (listener: () => void): (() => void) => {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
};

export const getTimeMachineTimeline = (): TimeMachineTimelineEntry[] =>
  history.map((entry) => ({
    id: entry.id,
    componentName: entry.componentName,
    changeCount: entry.changes.length,
    timestamp: entry.timestamp,
  }));

export const getTimeMachineCursor = (): number => travelCursor;

export const hasTimeMachineHistory = (): boolean => history.length > 0;

// The value a queue is about to land on: the tail of its in-flight travel
// expectations if any, otherwise its last rendered state.
const readQueueLogicalValue = (queue: RestorableHookQueue): unknown => {
  const expectations = pendingTravelValues.get(queue);
  const tailExpectation = expectations?.[expectations.length - 1];
  if (tailExpectation) return tailExpectation.value;
  return queue.lastRenderedState;
};

// Returns true when a render was actually scheduled (a skipped no-op
// dispatch schedules nothing).
const applyStateHookValue = (change: TimeMachineHookChange, value: unknown): boolean => {
  const queue = change.queueRef.deref();
  if (!queue) return false;
  // Skipping the no-op dispatch matters beyond perf: React's eager bailout
  // would never commit it, leaving a stale expected value that could swallow
  // a future legitimate change to the same value. With dispatches already in
  // flight, queue.lastRenderedState is stale, so the value the queue is about
  // to land on is the tail of the expectation list.
  if (Object.is(readQueueLogicalValue(queue), value)) return false;
  const expectations = pendingTravelValues.get(queue) ?? [];
  expectations.push({ value, dispatchedAt: Date.now() });
  pendingTravelValues.set(queue, expectations);
  try {
    queue.dispatch(() => value);
    return true;
  } catch (error) {
    expectations.pop();
    if (expectations.length === 0) {
      pendingTravelValues.delete(queue);
    }
    logRecoverableError("Time machine failed to restore hook state", error);
    return false;
  }
};

const findHookByQueue = (fiber: Fiber, queue: RestorableHookQueue): MemoizedState | null => {
  let hookNode: MemoizedState | null = fiber.memoizedState;
  while (hookNode && typeof hookNode === "object") {
    if (hookNode.queue === queue) return hookNode;
    hookNode = hookNode.next;
  }
  return null;
};

// React's render-phase bailout discards a render whose props identity and
// hook states all end where they started — which describes both a fiber
// whose reducer hook was written directly (no scheduling state changed) and
// a net-zero wiggle. Cloning memoizedProps flips beginWork's oldProps !==
// newProps check so the render commits; the same trick React DevTools'
// overrideHookState uses. Shallow clone, so memo comparisons stay equal.
const invalidatePropsIdentity = (fiber: Fiber): void => {
  const memoizedProps: unknown = fiber.memoizedProps;
  if (typeof memoizedProps !== "object" || memoizedProps === null) return;
  fiber.memoizedProps = { ...memoizedProps };
};

// useReducer state cannot be forced through dispatch (actions feed the app's
// reducer), so travel writes the hook's memoizedState/baseState directly on
// BOTH the fiber and its alternate. Writing both sides is what keeps the
// next render truthful (React clones hooks from whichever fiber is current)
// and makes the forced commit diff-invisible to the recorder — new and old
// memoizedState compare equal, so no bogus entry and no expectation
// bookkeeping is needed.
const writeReducerHookValue = (change: TimeMachineHookChange, value: unknown): boolean => {
  const queue = change.queueRef.deref();
  const recordedFiber = change.fiberRef.deref();
  if (!queue || !recordedFiber) return false;
  const latestFiber = getLatestFiber(recordedFiber);
  let didWrite = false;
  for (const fiber of [latestFiber, latestFiber.alternate]) {
    const hook = fiber ? findHookByQueue(fiber, queue) : null;
    if (!hook) continue;
    if (!Object.is(hook.memoizedState, value)) didWrite = true;
    hook.memoizedState = value;
    hook.baseState = value;
  }
  if (didWrite) {
    // Keeps React's eager-dispatch bailout comparing future real actions
    // against the travelled state instead of the stale one.
    queue.lastRenderedState = value;
    invalidatePropsIdentity(latestFiber);
  }
  return didWrite;
};

const WIGGLE_SENTINEL = Object.freeze({});

const wiggleStateQueueOnFiber = (fiber: Fiber): boolean => {
  let hookNode: MemoizedState | null = fiber.memoizedState;
  while (hookNode && typeof hookNode === "object") {
    const target = getRestorableHookTarget(hookNode);
    if (target && target.kind === "state") {
      const restoreValue = readQueueLogicalValue(target.queue);
      // The wiggle nets to zero, so this fiber's own bailout must also be
      // defeated or React discards the forced render entirely.
      invalidatePropsIdentity(fiber);
      try {
        target.queue.dispatch(() => WIGGLE_SENTINEL);
        target.queue.dispatch(() => restoreValue);
        return true;
      } catch (error) {
        logRecoverableError("Time machine failed to force a re-render", error);
        return false;
      }
    }
    hookNode = hookNode.next;
  }
  return false;
};

// A directly-written reducer hook changes no scheduling state, so nothing
// re-renders the component and the DOM would keep showing the old output.
// With no reachable renderer.scheduleUpdate (see module header), the render
// is forced by "wiggling" a useState queue: one dispatch to a unique sentinel
// (guaranteed to schedule) and one straight back to its logical value. The
// batch nets to zero — the commit shows no diff for the wiggled hook — but
// the render it forces re-reads the reducer hook's written state. A sibling
// hook on the same fiber is preferred; a reducer-only component borrows the
// nearest function-component ancestor with state instead, whose re-render
// reaches the reducer fiber because its props identity was invalidated.
const forceFiberRender = (fiber: Fiber): boolean => {
  let currentFiber: Fiber | null = getLatestFiber(fiber);
  while (currentFiber) {
    if (isHookStatefulFiber(currentFiber) && wiggleStateQueueOnFiber(currentFiber)) {
      return true;
    }
    currentFiber = currentFiber.return;
  }
  return false;
};

const applyEntryValues = (entry: TimeMachineEntry, shouldApplyNext: boolean): void => {
  // Reducer writes go first so the render forced by this step's state
  // dispatches (or by the wiggle) commits them in the same pass.
  let fibersAwaitingRender: Set<Fiber> | null = null;
  for (const change of entry.changes) {
    if (change.kind !== "reducer") continue;
    const value = shouldApplyNext ? change.nextValue : change.previousValue;
    const recordedFiber = change.fiberRef.deref();
    if (writeReducerHookValue(change, value) && recordedFiber) {
      fibersAwaitingRender ??= new Set();
      fibersAwaitingRender.add(getLatestFiber(recordedFiber));
    }
  }

  for (const change of entry.changes) {
    if (change.kind !== "state") continue;
    const value = shouldApplyNext ? change.nextValue : change.previousValue;
    const didScheduleRender = applyStateHookValue(change, value);
    if (didScheduleRender && fibersAwaitingRender) {
      const dispatchedFiber = change.fiberRef.deref();
      if (dispatchedFiber) fibersAwaitingRender.delete(getLatestFiber(dispatchedFiber));
    }
  }

  if (fibersAwaitingRender) {
    for (const fiber of fibersAwaitingRender) {
      forceFiberRender(fiber);
    }
  }
};

// Rewinding state without rewinding motion or interaction visuals looks
// broken, so while the cursor sits in the past the page's scheduling and
// animation clocks are frozen at the rewound moment and the hover/focus/
// active styling captured with the current entry is pinned back on; at the
// newest entry, time flows again and the live pseudo-classes take over.
const syncTimeFreezeToCursor = (): void => {
  if (travelCursor < history.length) {
    const rewoundMomentEntry = history[Math.max(0, travelCursor - 1)];
    freezePageClock();
    syncAnimationClock(rewoundMomentEntry.timestamp);
    applyInteractionSnapshot(travelCursor === 0 ? null : rewoundMomentEntry.interactionSnapshot);
  } else {
    releasePageClock();
    releaseAnimationClock();
    releaseInteractionPins();
  }
};

export const travelTimeMachineTo = (targetCursor: number): void => {
  const clampedCursor = Math.max(0, Math.min(history.length, Math.round(targetCursor)));
  if (clampedCursor === travelCursor) return;
  while (travelCursor > clampedCursor) {
    travelCursor -= 1;
    applyEntryValues(history[travelCursor], false);
  }
  while (travelCursor < clampedCursor) {
    applyEntryValues(history[travelCursor], true);
    travelCursor += 1;
  }
  syncTimeFreezeToCursor();
  notifyHistoryChange();
};
