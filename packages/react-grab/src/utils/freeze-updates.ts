import {
  _fiberRoots,
  getRDTHook,
  getFiberFromHostInstance,
  isCompositeFiber,
  type Fiber,
  type ReactRenderer,
  type FiberRoot,
} from "bippy";

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
let didInstallDispatcherProxy = false;

const dispatcherProxyCache = new WeakMap<object, object>();
const pendingStoreCallbacks = new Set<() => void>();
const pendingTransitionCallbacks: Array<() => void> = [];
const pausedQueueStates = new WeakMap<HookQueue, PausedQueueState>();
const pausedContextStates = new WeakMap<
  ContextDependency,
  PausedContextState
>();
const typedFiberRoots = _fiberRoots as Set<FiberRootLike>;

const getFiberRoot = (fiber: Fiber): FiberRootLike | null => {
  let current: Fiber | null = fiber;
  while (current.return) {
    current = current.return;
  }
  return (current.stateNode ?? null) as FiberRootLike | null;
};

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
    originalPendingDescriptor: Object.getOwnPropertyDescriptor(
      queue,
      "pending",
    ),
    pendingValueAtPause: queue.pending as PendingUpdate | null,
    bufferedPending: null,
  };

  if (typeof queue.getSnapshot === "function") {
    pauseState.originalGetSnapshot = queue.getSnapshot;
    pauseState.snapshotValueAtPause = queue.getSnapshot();
    queue.getSnapshot = () =>
      isUpdatesPaused
        ? pauseState.snapshotValueAtPause
        : pauseState.originalGetSnapshot!();
  }

  let currentPendingValue = pauseState.pendingValueAtPause;

  Object.defineProperty(queue, "pending", {
    configurable: true,
    enumerable: true,
    get: () =>
      isUpdatesPaused ? pauseState.bufferedPending : currentPendingValue,
    set: (newValue: PendingUpdate | null) => {
      if (isUpdatesPaused) {
        pauseState.bufferedPending = newValue;
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

  const mergedPending = mergePendingChains(
    pauseState.pendingValueAtPause ?? null,
    pauseState.bufferedPending ?? null,
  );

  if (pauseState.originalPendingDescriptor) {
    Object.defineProperty(
      queue,
      "pending",
      pauseState.originalPendingDescriptor,
    );
  } else {
    delete (queue as Record<string, unknown>).pending;
  }

  queue.pending = mergedPending;
  pausedQueueStates.delete(queue);
};

const pauseContextDependency = (contextDependency: ContextDependency): void => {
  if (pausedContextStates.has(contextDependency)) return;

  const pauseState: PausedContextState = {
    originalDescriptor: Object.getOwnPropertyDescriptor(
      contextDependency,
      "memoizedValue",
    ),
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

  // HACK: Initialize backing field for non-getter properties
  if (!pauseState.originalDescriptor?.get) {
    (
      contextDependency as unknown as { _memoizedValue: unknown }
    )._memoizedValue = pauseState.frozenValue;
  }

  pausedContextStates.set(contextDependency, pauseState);
};

const resumeContextDependency = (
  contextDependency: ContextDependency,
): void => {
  const pauseState = pausedContextStates.get(contextDependency);
  if (!pauseState) return;

  if (pauseState.originalDescriptor) {
    Object.defineProperty(
      contextDependency,
      "memoizedValue",
      pauseState.originalDescriptor,
    );
  } else {
    delete (contextDependency as unknown as Record<string, unknown>)
      .memoizedValue;
  }

  if (pauseState.didReceivePendingValue) {
    contextDependency.memoizedValue = pauseState.pendingValue;
  }

  pausedContextStates.delete(contextDependency);
};

const forEachHookQueue = (
  fiber: Fiber,
  callback: (queue: HookQueue) => void,
): void => {
  let hookState = fiber.memoizedState as unknown as HookState | null;
  while (hookState) {
    if (hookState.queue && typeof hookState.queue === "object") {
      callback(hookState.queue);
    }
    hookState = hookState.next;
  }
};

const forEachContextDependency = (
  fiber: Fiber,
  callback: (contextDependency: ContextDependency) => void,
): void => {
  let contextDependency = fiber.dependencies
    ?.firstContext as ContextDependency | null;
  while (
    contextDependency &&
    typeof contextDependency === "object" &&
    "memoizedValue" in contextDependency
  ) {
    callback(contextDependency);
    contextDependency = contextDependency.next;
  }
};

const traverseFibers = (
  fiber: Fiber | null,
  onCompositeFiber: (compositeFiber: Fiber) => void,
): void => {
  if (!fiber) return;
  if (isCompositeFiber(fiber)) onCompositeFiber(fiber);
  traverseFibers(fiber.child, onCompositeFiber);
  traverseFibers(fiber.sibling, onCompositeFiber);
};

const pauseFiber = (fiber: Fiber): void => {
  forEachHookQueue(fiber, pauseHookQueue);
  forEachContextDependency(fiber, pauseContextDependency);
};

const resumeFiber = (fiber: Fiber): void => {
  forEachHookQueue(fiber, resumeHookQueue);
  forEachContextDependency(fiber, resumeContextDependency);
};

const installDispatcherProxy = (renderer: ReactRenderer): void => {
  const dispatcherRef = renderer.currentDispatcherRef as {
    H?: unknown;
    current?: unknown;
  } | null;
  if (!dispatcherRef || typeof dispatcherRef !== "object") return;

  const dispatcherKey = "H" in dispatcherRef ? "H" : "current";
  let currentDispatcher = dispatcherRef[dispatcherKey];

  const createDispatcherProxy = (dispatcher: object): object => {
    return new Proxy(dispatcher, {
      get(target, propertyName, receiver) {
        const originalMethod = Reflect.get(target, propertyName, receiver);

        if (propertyName === "useSyncExternalStore") {
          type UseSyncExternalStore = <T>(
            subscribe: (onStoreChange: () => void) => () => void,
            getSnapshot: () => T,
            getServerSnapshot?: () => T,
          ) => T;

          return <T>(
            subscribe: (onStoreChange: () => void) => () => void,
            getSnapshot: () => T,
            getServerSnapshot?: () => T,
          ): T => {
            const wrappedSubscribe = (onChange: () => void) =>
              subscribe(() => {
                if (isUpdatesPaused) {
                  pendingStoreCallbacks.add(onChange);
                } else {
                  onChange();
                }
              });
            return (originalMethod as UseSyncExternalStore)(
              wrappedSubscribe,
              getSnapshot,
              getServerSnapshot,
            );
          };
        }

        if (
          propertyName === "useTransition" &&
          typeof originalMethod === "function"
        ) {
          return (...hookArgs: unknown[]) => {
            const result = (
              originalMethod as (...args: unknown[]) => unknown
            )(...hookArgs);
            if (!Array.isArray(result) || typeof result[1] !== "function") {
              return result;
            }
            const [isPending, startTransition] = result as [
              boolean,
              (transitionCallback: () => void) => void,
            ];
            return [
              isPending,
              (transitionCallback: () => void) => {
                if (isUpdatesPaused) {
                  pendingTransitionCallbacks.push(() =>
                    startTransition(transitionCallback),
                  );
                } else {
                  startTransition(transitionCallback);
                }
              },
            ];
          };
        }

        return originalMethod;
      },
    });
  };

  Object.defineProperty(dispatcherRef, dispatcherKey, {
    configurable: true,
    enumerable: true,
    get: () => {
      if (!currentDispatcher) return currentDispatcher;

      if (!isUpdatesPaused) return currentDispatcher;

      const cachedProxy = dispatcherProxyCache.get(currentDispatcher as object);
      if (cachedProxy) return cachedProxy;

      const proxy = createDispatcherProxy(currentDispatcher as object);
      dispatcherProxyCache.set(currentDispatcher as object, proxy);
      return proxy;
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
            } catch {
              // HACK: Swallow errors during cleanup
            }
          }
        }
      }
    } catch {
      // HACK: Swallow errors during cleanup
    }
  });
};

const invokeCallbacks = (callbacks: Array<() => void>): void => {
  for (const callback of callbacks) {
    try {
      callback();
    } catch {
      // HACK: Swallow errors during replay
    }
  }
};

export const initializeFreezeSupport = (): void => {
  if (didInstallDispatcherProxy) return;
  didInstallDispatcherProxy = true;

  for (const renderer of getRDTHook().renderers.values()) {
    installDispatcherProxy(renderer);
  }
};

export const freezeUpdates = (): (() => void) => {
  if (isUpdatesPaused) return () => {};

  initializeFreezeSupport();
  isUpdatesPaused = true;

  const fiberRoots = collectFiberRoots();
  for (const fiberRoot of fiberRoots) {
    traverseFibers(fiberRoot.current, pauseFiber);
  }

  return () => {
    if (!isUpdatesPaused) return;

    const fiberRootsToResume = collectFiberRoots();
    for (const fiberRoot of fiberRootsToResume) {
      traverseFibers(fiberRoot.current, resumeFiber);
    }

    isUpdatesPaused = false;

    const storeCallbacksToInvoke = Array.from(pendingStoreCallbacks);
    const transitionCallbacksToInvoke = pendingTransitionCallbacks.slice();
    pendingStoreCallbacks.clear();
    pendingTransitionCallbacks.length = 0;

    invokeCallbacks(storeCallbacksToInvoke);
    invokeCallbacks(transitionCallbacksToInvoke);
    scheduleReactUpdate(fiberRootsToResume);
  };
};
