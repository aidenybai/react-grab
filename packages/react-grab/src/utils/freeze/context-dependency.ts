import { freezeState, pausedContextStates } from "./state.js";
import type { ContextDependency, PausedContextState } from "./types.js";

/**
 * Pauses a single context-dependency node by replacing its `memoizedValue`
 * data property with a get/set descriptor that returns the frozen value
 * while paused. Writes during pause are buffered into `pendingValue` so
 * they can be re-applied on resume.
 */
export const pauseContextDependency = (contextDependency: ContextDependency): void => {
  if (pausedContextStates.has(contextDependency)) return;

  const pauseState: PausedContextState = {
    originalDescriptor: Object.getOwnPropertyDescriptor(contextDependency, "memoizedValue"),
    frozenValue: contextDependency.memoizedValue,
  };

  Object.defineProperty(contextDependency, "memoizedValue", {
    configurable: true,
    enumerable: true,
    get() {
      if (freezeState.isUpdatesPaused) return pauseState.frozenValue;
      if (pauseState.originalDescriptor?.get) {
        return pauseState.originalDescriptor.get.call(this) as unknown;
      }
      return (this as { _memoizedValue?: unknown })._memoizedValue;
    },
    set(value: unknown) {
      if (freezeState.isUpdatesPaused) {
        pauseState.pendingValue = value;
        pauseState.didReceivePendingValue = true;
        return;
      }
      if (pauseState.originalDescriptor?.set) {
        pauseState.originalDescriptor.set.call(this, value);
      } else {
        (this as { _memoizedValue: unknown })._memoizedValue = value;
      }
    },
  });

  // Replacing a plain data property (e.g. { memoizedValue: 42 }) with a
  // get/set descriptor via Object.defineProperty removes the original value,
  // so we initialize a _memoizedValue backing field for the new getter to
  // read from.
  if (!pauseState.originalDescriptor?.get) {
    (contextDependency as unknown as { _memoizedValue: unknown })._memoizedValue =
      pauseState.frozenValue;
  }

  pausedContextStates.set(contextDependency, pauseState);
};

/**
 * Restores the original `memoizedValue` descriptor and re-applies any value
 * that was written during the pause window.
 */
export const resumeContextDependency = (contextDependency: ContextDependency): void => {
  const pauseState = pausedContextStates.get(contextDependency);
  if (!pauseState) return;

  if (pauseState.originalDescriptor) {
    Object.defineProperty(contextDependency, "memoizedValue", pauseState.originalDescriptor);
  } else {
    delete (contextDependency as unknown as Record<string, unknown>).memoizedValue;
  }

  if (pauseState.didReceivePendingValue) {
    contextDependency.memoizedValue = pauseState.pendingValue;
  }

  pausedContextStates.delete(contextDependency);
};
