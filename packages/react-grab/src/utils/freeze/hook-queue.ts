import {
  extractActionsFromChain,
  mergePendingChains,
} from "./pending-update-chain.js";
import { freezeState, pausedQueueStates, pendingStateUpdates } from "./state.js";
import type { HookQueue, PausedQueueState, PendingUpdate } from "./types.js";

/**
 * Pauses a single React hook queue (useState/useReducer/useSyncExternalStore)
 * by replacing its `pending` data property with a get/set descriptor and
 * wrapping `getSnapshot`. Writes during pause are buffered into
 * `bufferedPending`; on resume they're replayed onto the original dispatch.
 */
export const pauseHookQueue = (queue: HookQueue): void => {
  if (!queue || pausedQueueStates.has(queue)) return;

  const pauseState: PausedQueueState = {
    originalPendingDescriptor: Object.getOwnPropertyDescriptor(queue, "pending"),
    pendingValueAtPause: queue.pending as PendingUpdate | null,
    bufferedPending: null,
  };

  if (typeof queue.getSnapshot === "function") {
    pauseState.originalGetSnapshot = queue.getSnapshot;
    pauseState.snapshotValueAtPause = queue.getSnapshot();
    queue.getSnapshot = () =>
      freezeState.isUpdatesPaused
        ? pauseState.snapshotValueAtPause
        : pauseState.originalGetSnapshot!();
  }

  let currentPendingValue = pauseState.pendingValueAtPause;

  Object.defineProperty(queue, "pending", {
    configurable: true,
    enumerable: true,
    get: () => (freezeState.isUpdatesPaused ? null : currentPendingValue),
    set: (newValue: PendingUpdate | null) => {
      if (freezeState.isUpdatesPaused) {
        if (newValue !== null) {
          pauseState.bufferedPending = mergePendingChains(
            pauseState.bufferedPending ?? null,
            newValue,
          );
        }
        return;
      }
      currentPendingValue = newValue;
    },
  });

  pausedQueueStates.set(queue, pauseState);
};

/**
 * Restores the original `pending` descriptor + `getSnapshot`, then queues
 * the buffered actions (in order: pending-at-pause then buffered-during-pause)
 * onto the unfreeze replay list so the orchestrator's `invokeCallbacks` pass
 * can re-dispatch them.
 */
export const resumeHookQueue = (queue: HookQueue): void => {
  const pauseState = pausedQueueStates.get(queue);
  if (!pauseState) return;

  if (pauseState.originalGetSnapshot) {
    queue.getSnapshot = pauseState.originalGetSnapshot;
  }

  if (pauseState.originalPendingDescriptor) {
    Object.defineProperty(queue, "pending", pauseState.originalPendingDescriptor);
  } else {
    delete (queue as Record<string, unknown>).pending;
  }

  queue.pending = null;

  const dispatch = queue.dispatch;
  if (typeof dispatch === "function") {
    const pendingActions = extractActionsFromChain(pauseState.pendingValueAtPause ?? null);
    const bufferedActions = extractActionsFromChain(pauseState.bufferedPending ?? null);
    for (const action of [...pendingActions, ...bufferedActions]) {
      pendingStateUpdates.push(() => dispatch(action));
    }
  }

  pausedQueueStates.delete(queue);
};
