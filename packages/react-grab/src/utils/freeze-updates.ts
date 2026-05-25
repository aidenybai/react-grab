// During grab mode the page must freeze visually, but there is no public React
// API to pause rendering. This module patches the internal dispatcher
// (ReactCurrentDispatcher.H or .current) to intercept and buffer
// useState/useReducer/useTransition/useSyncExternalStore calls while frozen.
// On unfreeze the buffered updates are replayed in order (store callbacks, then
// transitions, then state updates). The approach is inherently fragile and
// coupled to React internals, so all replay paths use try/catch.
import {
  _fiberRoots,
  getRDTHook,
  getFiberFromHostInstance,
  isCompositeFiber,
  type Fiber,
  type ReactRenderer,
} from "bippy";
import { logRecoverableError } from "./log-recoverable-error.js";

import type {
  ContextDependency,
  DispatchFunction,
  FiberRootLike,
  HookState,
  OriginalHooks,
  TransitionFunction,
} from "./freeze/types.js";
import {
  pauseContextDependency,
  resumeContextDependency,
} from "./freeze/context-dependency.js";
import { pauseHookQueue, resumeHookQueue } from "./freeze/hook-queue.js";
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
} from "./freeze/state.js";

const typedFiberRoots = _fiberRoots as Set<FiberRootLike>;

const getFiberRoot = (fiber: Fiber): FiberRootLike | null => {
  let current: Fiber | null = fiber;
  while (current.return) {
    current = current.return;
  }
  return (current.stateNode ?? null) as FiberRootLike | null;
};

// Collects React fiber roots, preferring bippy's tracked set but falling back
// to a DOM walk when the app mounted before bippy instrumented the renderers.
const collectFiberRoots = (): Set<FiberRootLike> => {
  if (typedFiberRoots.size > 0) {
    return typedFiberRoots;
  }

  const collectedRoots = new Set<FiberRootLike>();

  const traverseDOM = (element: Element): void => {
    const fiber = getFiberFromHostInstance(element);
    if (fiber) {
      const fiberRoot = getFiberRoot(fiber);
      if (fiberRoot) collectedRoots.add(fiberRoot);
      return;
    }
    for (const childElement of Array.from(element.children)) {
      traverseDOM(childElement);
      if (collectedRoots.size > 0) return;
    }
  };

  traverseDOM(document.body);
  return collectedRoots;
};

// pauseFiber/resumeFiber inline the hook-queue and context-dependency loops
// rather than receiving a generic callback. The indirect callback site was
// the source of recurring "wrong call target" deopts whenever freeze and
// unfreeze were exercised in alternation across the same fiber subtree.
const pauseFiber = (fiber: Fiber): void => {
  let hookState = fiber.memoizedState as unknown as HookState | null;
  while (hookState) {
    if (hookState.queue && typeof hookState.queue === "object") {
      pauseHookQueue(hookState.queue);
    }
    hookState = hookState.next;
  }

  let contextDependency = fiber.dependencies?.firstContext as ContextDependency | null;
  while (
    contextDependency &&
    typeof contextDependency === "object" &&
    "memoizedValue" in contextDependency
  ) {
    pauseContextDependency(contextDependency);
    contextDependency = contextDependency.next;
  }
};

const resumeFiber = (fiber: Fiber): void => {
  let hookState = fiber.memoizedState as unknown as HookState | null;
  while (hookState) {
    if (hookState.queue && typeof hookState.queue === "object") {
      resumeHookQueue(hookState.queue);
    }
    hookState = hookState.next;
  }

  let contextDependency = fiber.dependencies?.firstContext as ContextDependency | null;
  while (
    contextDependency &&
    typeof contextDependency === "object" &&
    "memoizedValue" in contextDependency
  ) {
    resumeContextDependency(contextDependency);
    contextDependency = contextDependency.next;
  }
};

// Two single-callback recursors instead of a polymorphic `(fiber, cb) => ...`.
// Keeping the indirect call site monomorphic per traversal lets V8 inline the
// callback and avoids "wrong call target" deopts when freeze/unfreeze alternate.
const traverseFibersAndPause = (fiber: Fiber | null): void => {
  if (!fiber) return;
  if (isCompositeFiber(fiber)) pauseFiber(fiber);
  traverseFibersAndPause(fiber.child);
  traverseFibersAndPause(fiber.sibling);
};

const traverseFibersAndResume = (fiber: Fiber | null): void => {
  if (!fiber) return;
  if (isCompositeFiber(fiber)) resumeFiber(fiber);
  traverseFibersAndResume(fiber.child);
  traverseFibersAndResume(fiber.sibling);
};

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

const scheduleReactUpdate = (fiberRoots: Set<FiberRootLike>): void => {
  queueMicrotask(() => {
    try {
      for (const renderer of getRDTHook().renderers.values()) {
        if (typeof renderer.scheduleUpdate !== "function") continue;
        for (const fiberRoot of fiberRoots) {
          if (fiberRoot.current) {
            try {
              renderer.scheduleUpdate(fiberRoot.current);
            } catch (error) {
              logRecoverableError("scheduleUpdate failed during unfreeze", error);
            }
          }
        }
      }
    } catch (error) {
      logRecoverableError("scheduleReactUpdate failed", error);
    }
  });
};

const invokeCallbacks = (callbacks: Array<() => void>): void => {
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      logRecoverableError("Callback failed during state replay", error);
    }
  }
};

const initializeFreezeSupport = (): void => {
  for (const renderer of getRDTHook().renderers.values()) {
    if (renderersWithPatchedDispatcher.has(renderer)) continue;
    installDispatcherPatching(renderer);
    renderersWithPatchedDispatcher.add(renderer);
  }
};

export const freezeUpdates = (): (() => void) => {
  if (freezeState.isUpdatesPaused) return () => {};

  initializeFreezeSupport();
  freezeState.isUpdatesPaused = true;

  const fiberRoots = collectFiberRoots();
  for (const fiberRoot of fiberRoots) {
    traverseFibersAndPause(fiberRoot.current);
  }

  return () => {
    if (!freezeState.isUpdatesPaused) return;

    try {
      const fiberRootsToResume = collectFiberRoots();
      for (const fiberRoot of fiberRootsToResume) {
        traverseFibersAndResume(fiberRoot.current);
      }

      const storeCallbacksToInvoke = Array.from(pendingStoreCallbacks);
      const transitionCallbacksToInvoke = pendingTransitionCallbacks.slice();
      const stateUpdatesToInvoke = pendingStateUpdates.slice();

      freezeState.isUpdatesPaused = false;

      invokeCallbacks(storeCallbacksToInvoke);
      invokeCallbacks(transitionCallbacksToInvoke);
      invokeCallbacks(stateUpdatesToInvoke);
      scheduleReactUpdate(fiberRootsToResume);
    } finally {
      pendingStoreCallbacks.clear();
      pendingTransitionCallbacks.length = 0;
      pendingStateUpdates.length = 0;
    }
  };
};
