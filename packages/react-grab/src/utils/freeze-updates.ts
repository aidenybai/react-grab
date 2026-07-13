// During grab mode the page must freeze visually, but there is no public React
// API to pause rendering. This module patches the internal dispatcher
// (ReactCurrentDispatcher.H or .current) to intercept and buffer
// useState/useReducer/useTransition/useSyncExternalStore calls while frozen.
// On unfreeze the buffered updates are replayed in order (store callbacks, then
// transitions, then state updates). The approach is inherently fragile and
// coupled to React internals, so all replay paths use try/catch.
import {
  _fiberRoots,
  getFiberFromHostInstance,
  getRDTHook,
  isCompositeFiber,
  type Fiber,
  type ReactRenderer,
  type FiberRoot,
} from "bippy";
import { logRecoverableError } from "./log-recoverable-error.js";
import { IS_DEMO } from "./runtime-mode.js";

interface FiberRootLike extends FiberRoot {
  current: Fiber | null;
}

interface PendingUpdate {
  next: PendingUpdate | null;
  action: unknown;
  [key: string]: unknown;
}

interface HookQueue {
  pending?: unknown;
  dispatch?: ((...args: unknown[]) => void) | null;
  getSnapshot?: () => unknown;
}

interface HookState {
  queue: HookQueue | null;
  next: HookState | null;
}

interface ContextDependency {
  memoizedValue: unknown;
  next: ContextDependency | null;
}

interface PausedQueueState {
  originalGetSnapshot?: () => unknown;
  snapshotValueAtPause?: unknown;
  originalPendingDescriptor?: PropertyDescriptor;
  pendingValueAtPause?: PendingUpdate | null;
  bufferedPending?: PendingUpdate | null;
}

interface PausedContextState {
  originalDescriptor?: PropertyDescriptor;
  frozenValue: unknown;
  pendingValue?: unknown;
  didReceivePendingValue?: boolean;
}

let isUpdatesPaused = false;
let freezeOwnerCount = 0;

const getOrCache = <K extends object, V>(cache: WeakMap<K, V>, key: K, create: () => V): V => {
  const cached = cache.get(key);
  if (cached) return cached;
  const value = create();
  cache.set(key, value);
  return value;
};

type DispatchFunction = (...args: unknown[]) => void;
type TransitionFunction = (callback: () => void) => void;

interface OriginalHooks {
  useState: DispatchFunction;
  useReducer: DispatchFunction;
  useTransition: DispatchFunction;
  useSyncExternalStore: DispatchFunction;
}

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

const mergePendingChains = (
  original: PendingUpdate | null,
  buffered: PendingUpdate | null,
): PendingUpdate | null => {
  if (!original) return buffered;
  if (!buffered) return original;
  if (!original.next || !buffered.next) return buffered;

  const originalFirst = original.next;
  const bufferedFirst = buffered.next;
  const isOriginalSingle = original === originalFirst;
  const isBufferedSingle = buffered === bufferedFirst;

  if (isOriginalSingle && isBufferedSingle) {
    original.next = buffered;
    buffered.next = original;
  } else if (isOriginalSingle) {
    original.next = bufferedFirst;
    buffered.next = original;
  } else if (isBufferedSingle) {
    buffered.next = originalFirst;
    original.next = buffered;
  } else {
    original.next = bufferedFirst;
    buffered.next = originalFirst;
  }

  return buffered;
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

const extractActionsFromChain = (pending: PendingUpdate | null): unknown[] => {
  if (!pending) return [];
  const actions: unknown[] = [];
  const first = pending.next;
  if (!first) return [];
  let current: PendingUpdate | null = first;
  do {
    if (current) {
      actions.push(current.action);
      current = current.next;
    }
  } while (current && current !== first);
  return actions;
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

// Iterative pre-order walk over the fiber subtree rooted at `root`, via the
// child/sibling/return pointers. Iterative (not recursive) because a large app
// can have tens of thousands of fibers nested deep enough to blow the call
// stack, and it avoids per-node call overhead. Two single-purpose copies keep
// the visit call site monomorphic (a shared `(root, visit)` form deopted when
// freeze/unfreeze alternated over the same subtree).
const traverseFibersAndPause = (root: Fiber | null): void => {
  let node = root;
  while (node) {
    if (isCompositeFiber(node)) pauseFiber(node);
    if (node.child) {
      node = node.child;
      continue;
    }
    while (node !== root && !node.sibling) {
      node = node.return as Fiber | null;
      if (!node) return;
    }
    if (node === root) return;
    node = node.sibling;
  }
};

const traverseFibersAndResume = (root: Fiber | null): void => {
  let node = root;
  while (node) {
    if (isCompositeFiber(node)) resumeFiber(node);
    if (node.child) {
      node = node.child;
      continue;
    }
    while (node !== root && !node.sibling) {
      node = node.return as Fiber | null;
      if (!node) return;
    }
    if (node === root) return;
    node = node.sibling;
  }
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

const clearPendingUpdates = (): void => {
  pendingStoreCallbacks.clear();
  pendingTransitionCallbacks.length = 0;
  pendingStateUpdates.length = 0;
};

const resumeUpdates = (): void => {
  let fiberRootsToResume = new Set<FiberRootLike>();
  try {
    fiberRootsToResume = collectFiberRoots();
  } catch (error) {
    logRecoverableError("Collecting fiber roots failed during unfreeze", error);
  }

  const storeCallbacksToInvoke = Array.from(pendingStoreCallbacks);
  const transitionCallbacksToInvoke = pendingTransitionCallbacks.slice();
  const stateUpdatesToInvoke = pendingStateUpdates.slice();
  isUpdatesPaused = false;

  try {
    for (const fiberRoot of fiberRootsToResume) {
      try {
        traverseFibersAndResume(fiberRoot.current);
      } catch (error) {
        logRecoverableError("Resuming a fiber root failed during unfreeze", error);
      }
    }

    invokeCallbacks(storeCallbacksToInvoke);
    invokeCallbacks(transitionCallbacksToInvoke);
    invokeCallbacks(stateUpdatesToInvoke);
    scheduleReactUpdate(fiberRootsToResume);
  } finally {
    clearPendingUpdates();
  }
};

export const freezeUpdates = (): (() => void) => {
  // Demo mode is display-only and must never pause the host app's React renders,
  // even via the toolbar's own (ungated) freeze path.
  if (IS_DEMO) return () => {};

  if (freezeOwnerCount === 0) {
    try {
      initializeFreezeSupport();
      isUpdatesPaused = true;

      const fiberRoots = collectFiberRoots();
      for (const fiberRoot of fiberRoots) {
        traverseFibersAndPause(fiberRoot.current);
      }
    } catch (error) {
      logRecoverableError("Pausing React updates failed", error);
      if (isUpdatesPaused) resumeUpdates();
      return () => {};
    }
  }

  freezeOwnerCount += 1;
  let didReleaseFreeze = false;

  return () => {
    if (didReleaseFreeze) return;
    didReleaseFreeze = true;
    freezeOwnerCount -= 1;
    if (freezeOwnerCount === 0) resumeUpdates();
  };
};
