import { getRDTHook, type ReactRenderer } from "bippy";
import {
  freezeState,
  getOrCache,
  patchedDispatchers,
  pendingStateUpdates,
  pendingStoreCallbacks,
  pendingTransitionCallbacks,
  renderersWithPatchedDispatcher,
  wrappedDispatchCache,
  wrappedStartTransitionCache,
} from "./state.js";
import type { DispatchFunction, OriginalHooks, TransitionFunction } from "./types.js";

/**
 * Patches a single React dispatcher object (the value behind
 * `ReactCurrentDispatcher.H` / `.current`) so its four hook factories
 * (useState, useReducer, useTransition, useSyncExternalStore) return
 * freeze-aware variants when the overlay has called freeze.
 *
 * Each variant defers to the original implementation while NOT paused,
 * then wraps the returned dispatch / startTransition / subscribe function
 * with a guarded version that re-routes calls into the replay queues
 * while paused.
 */
const patchDispatcher = (dispatcher: object): void => {
  if (patchedDispatchers.has(dispatcher)) return;

  const typedDispatcher = dispatcher as Record<string, DispatchFunction>;
  const originalHooks: OriginalHooks = {
    useState: typedDispatcher.useState,
    useReducer: typedDispatcher.useReducer,
    useTransition: typedDispatcher.useTransition,
    useSyncExternalStore: typedDispatcher.useSyncExternalStore,
  };
  patchedDispatchers.set(dispatcher, originalHooks);

  typedDispatcher.useState = (...args: unknown[]) => {
    const result = originalHooks.useState.apply(dispatcher, args) as unknown;
    if (!freezeState.isUpdatesPaused) return result;
    if (!Array.isArray(result) || typeof result[1] !== "function") return result;
    const [state, dispatch] = result as [unknown, DispatchFunction];
    const wrappedDispatch = getOrCache(
      wrappedDispatchCache,
      dispatch,
      () =>
        (...dispatchArgs: unknown[]) => {
          if (freezeState.isUpdatesPaused) {
            pendingStateUpdates.push(() => dispatch(...dispatchArgs));
          } else {
            dispatch(...dispatchArgs);
          }
        },
    );
    return [state, wrappedDispatch];
  };

  typedDispatcher.useReducer = (...args: unknown[]) => {
    const result = originalHooks.useReducer.apply(dispatcher, args) as unknown;
    if (!freezeState.isUpdatesPaused) return result;
    if (!Array.isArray(result) || typeof result[1] !== "function") return result;
    const [state, dispatch] = result as [unknown, DispatchFunction];
    const wrappedDispatch = getOrCache(
      wrappedDispatchCache,
      dispatch,
      () =>
        (...dispatchArgs: unknown[]) => {
          if (freezeState.isUpdatesPaused) {
            pendingStateUpdates.push(() => dispatch(...dispatchArgs));
          } else {
            dispatch(...dispatchArgs);
          }
        },
    );
    return [state, wrappedDispatch];
  };

  typedDispatcher.useTransition = (...args: unknown[]) => {
    const result = originalHooks.useTransition.apply(dispatcher, args) as unknown;
    if (!freezeState.isUpdatesPaused) return result;
    if (!Array.isArray(result) || typeof result[1] !== "function") return result;
    const [isPending, startTransition] = result as [boolean, TransitionFunction];
    const wrappedStartTransition = getOrCache(
      wrappedStartTransitionCache,
      startTransition,
      () => (transitionCallback: () => void) => {
        if (freezeState.isUpdatesPaused) {
          pendingTransitionCallbacks.push(() => startTransition(transitionCallback));
        } else {
          startTransition(transitionCallback);
        }
      },
    );
    return [isPending, wrappedStartTransition];
  };

  type UseSyncExternalStore = <T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ) => T;

  typedDispatcher.useSyncExternalStore = (<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ): T => {
    if (!freezeState.isUpdatesPaused) {
      return (originalHooks.useSyncExternalStore as UseSyncExternalStore)(
        subscribe,
        getSnapshot,
        getServerSnapshot,
      );
    }
    const wrappedSubscribe = (onChange: () => void) =>
      subscribe(() => {
        if (freezeState.isUpdatesPaused) {
          pendingStoreCallbacks.add(onChange);
        } else {
          onChange();
        }
      });
    return (originalHooks.useSyncExternalStore as UseSyncExternalStore)(
      wrappedSubscribe,
      getSnapshot,
      getServerSnapshot,
    );
  }) as DispatchFunction;
};

/**
 * Installs the dispatcher patching for one renderer by intercepting its
 * `currentDispatcherRef.H` (React 19+) or `.current` (React 18) getter,
 * so every dispatcher object that ever gets assigned through the ref runs
 * through `patchDispatcher` lazily.
 */
const installDispatcherPatching = (renderer: ReactRenderer): void => {
  const dispatcherRef = renderer.currentDispatcherRef as {
    H?: unknown;
    current?: unknown;
  } | null;
  if (!dispatcherRef || typeof dispatcherRef !== "object") return;

  const dispatcherKey = "H" in dispatcherRef ? "H" : "current";
  let currentDispatcher = dispatcherRef[dispatcherKey];

  Object.defineProperty(dispatcherRef, dispatcherKey, {
    configurable: true,
    enumerable: true,
    get: () => {
      if (currentDispatcher && typeof currentDispatcher === "object") {
        patchDispatcher(currentDispatcher);
      }
      return currentDispatcher;
    },
    set: (newDispatcher) => {
      currentDispatcher = newDispatcher;
    },
  });
};

/**
 * Idempotent setup: installs the dispatcher patching for every renderer
 * known to the React DevTools hook. Called on every `freezeUpdates()` so
 * renderers that mounted between freezes also get patched.
 */
export const initializeFreezeSupport = (): void => {
  for (const renderer of getRDTHook().renderers.values()) {
    if (renderersWithPatchedDispatcher.has(renderer)) continue;
    installDispatcherPatching(renderer);
    renderersWithPatchedDispatcher.add(renderer);
  }
};
