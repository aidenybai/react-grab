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
  HookQueue,
  HookState,
  OriginalHooks,
  PausedContextState,
  PausedQueueState,
  PendingUpdate,
  TransitionFunction,
} from "./freeze/types.js";
import {
  extractActionsFromChain,
  mergePendingChains,
} from "./freeze/pending-update-chain.js";

let isUpdatesPaused = false;

const getOrCache = <K extends object, V>(cache: WeakMap<K, V>, key: K, create: () => V): V => {
  const cached = cache.get(key);
  if (cached) return cached;
  const value = create();
  cache.set(key, value);
  return value;
};

const patchedDispatchers = new WeakMap<object, OriginalHooks>();
const wrappedDispatchCache = new WeakMap<DispatchFunction, DispatchFunction>();
const wrappedStartTransitionCache = new WeakMap<TransitionFunction, TransitionFunction>();
const pendingStoreCallbacks = new Set<() => void>();
const pendingTransitionCallbacks: Array<() => void> = [];
const pendingStateUpdates: Array<() => void> = [];
const pausedQueueStates = new WeakMap<HookQueue, PausedQueueState>();
const pausedContextStates = new WeakMap<ContextDependency, PausedContextState>();
const renderersWithPatchedDispatcher = new WeakSet<ReactRenderer>();
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

const pauseHookQueue = (queue: HookQueue): void => {
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
      isUpdatesPaused ? pauseState.snapshotValueAtPause : pauseState.originalGetSnapshot!();
  }

  let currentPendingValue = pauseState.pendingValueAtPause;

  Object.defineProperty(queue, "pending", {
    configurable: true,
    enumerable: true,
    get: () => (isUpdatesPaused ? null : currentPendingValue),
    set: (newValue: PendingUpdate | null) => {
      if (isUpdatesPaused) {
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

const resumeHookQueue = (queue: HookQueue): void => {
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

const pauseContextDependency = (contextDependency: ContextDependency): void => {
  if (pausedContextStates.has(contextDependency)) return;

  const pauseState: PausedContextState = {
    originalDescriptor: Object.getOwnPropertyDescriptor(contextDependency, "memoizedValue"),
    frozenValue: contextDependency.memoizedValue,
  };

  Object.defineProperty(contextDependency, "memoizedValue", {
    configurable: true,
    enumerable: true,
    get() {
      if (isUpdatesPaused) return pauseState.frozenValue;
      if (pauseState.originalDescriptor?.get) {
        return pauseState.originalDescriptor.get.call(this) as unknown;
      }
      return (this as { _memoizedValue?: unknown })._memoizedValue;
    },
    set(value: unknown) {
      if (isUpdatesPaused) {
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

const resumeContextDependency = (contextDependency: ContextDependency): void => {
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
    if (!isUpdatesPaused) return result;
    if (!Array.isArray(result) || typeof result[1] !== "function") return result;
    const [state, dispatch] = result as [unknown, DispatchFunction];
    const wrappedDispatch = getOrCache(
      wrappedDispatchCache,
      dispatch,
      () =>
        (...dispatchArgs: unknown[]) => {
          if (isUpdatesPaused) {
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
    if (!isUpdatesPaused) return result;
    if (!Array.isArray(result) || typeof result[1] !== "function") return result;
    const [state, dispatch] = result as [unknown, DispatchFunction];
    const wrappedDispatch = getOrCache(
      wrappedDispatchCache,
      dispatch,
      () =>
        (...dispatchArgs: unknown[]) => {
          if (isUpdatesPaused) {
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
    if (!isUpdatesPaused) return result;
    if (!Array.isArray(result) || typeof result[1] !== "function") return result;
    const [isPending, startTransition] = result as [boolean, TransitionFunction];
    const wrappedStartTransition = getOrCache(
      wrappedStartTransitionCache,
      startTransition,
      () => (transitionCallback: () => void) => {
        if (isUpdatesPaused) {
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
    if (!isUpdatesPaused) {
      return (originalHooks.useSyncExternalStore as UseSyncExternalStore)(
        subscribe,
        getSnapshot,
        getServerSnapshot,
      );
    }
    const wrappedSubscribe = (onChange: () => void) =>
      subscribe(() => {
        if (isUpdatesPaused) {
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
  if (isUpdatesPaused) return () => {};

  initializeFreezeSupport();
  isUpdatesPaused = true;

  const fiberRoots = collectFiberRoots();
  for (const fiberRoot of fiberRoots) {
    traverseFibersAndPause(fiberRoot.current);
  }

  return () => {
    if (!isUpdatesPaused) return;

    try {
      const fiberRootsToResume = collectFiberRoots();
      for (const fiberRoot of fiberRootsToResume) {
        traverseFibersAndResume(fiberRoot.current);
      }

      const storeCallbacksToInvoke = Array.from(pendingStoreCallbacks);
      const transitionCallbacksToInvoke = pendingTransitionCallbacks.slice();
      const stateUpdatesToInvoke = pendingStateUpdates.slice();

      isUpdatesPaused = false;

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
