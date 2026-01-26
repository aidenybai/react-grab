import {
  _fiberRoots,
  getRDTHook,
  getFiberFromHostInstance,
  isCompositeFiber,
  type Fiber,
  type ReactRenderer,
  type FiberRoot,
} from "bippy";

let isUpdatesPaused = false;

const pendingStoreChangeCallbacks = new Set<() => void>();
const pendingTransitionCallbacks: Array<() => void> = [];
const pendingStateUpdates: Array<() => void> = [];

interface FiberRootLike extends FiberRoot {
  current: Fiber | null;
}

interface DispatcherRef {
  H?: unknown;
  current?: unknown;
}

interface Dispatcher {
  useSyncExternalStore: <T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ) => T;
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
}

interface PausedDispatcherState {
  dispatcherKey: "H" | "current";
  originalDescriptor: PropertyDescriptor | undefined;
}

interface PausedContextState {
  originalDescriptor?: PropertyDescriptor;
  frozenValue: unknown;
  getValueDuringPause?: () => { value: unknown; didReceive: boolean };
}

const pausedDispatcherStates = new Map<ReactRenderer, PausedDispatcherState>();
const pausedQueueStates = new WeakMap<HookQueue, PausedQueueState>();
const pausedContextStates = new WeakMap<
  ContextDependency,
  PausedContextState
>();
const typedFiberRoots = _fiberRoots as Set<FiberRootLike>;

const getFiberRootFromFiber = (fiber: Fiber): FiberRootLike | null => {
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

  const roots = new Set<FiberRootLike>();

  const traverseDOM = (node: Element): void => {
    const fiber = getFiberFromHostInstance(node);
    if (fiber) {
      const fiberRoot = getFiberRootFromFiber(fiber);
      if (fiberRoot) {
        roots.add(fiberRoot);
      }
      return;
    }

    for (const child of Array.from(node.children)) {
      traverseDOM(child);
      if (roots.size > 0) return;
    }
  };

  traverseDOM(document.body);
  return roots;
};

const pauseHookQueue = (queue: HookQueue): void => {
  if (!queue || pausedQueueStates.has(queue)) return;

  const pauseState: PausedQueueState = {};

  if ("getSnapshot" in queue && typeof queue.getSnapshot === "function") {
    pauseState.originalGetSnapshot = queue.getSnapshot;
    pauseState.snapshotValueAtPause = queue.getSnapshot();

    queue.getSnapshot = () =>
      isUpdatesPaused
        ? pauseState.snapshotValueAtPause
        : pauseState.originalGetSnapshot!();
  }

  pausedQueueStates.set(queue, pauseState);
};

const resumeHookQueue = (queue: HookQueue): void => {
  const pauseState = pausedQueueStates.get(queue);
  if (!pauseState) return;

  if (pauseState.originalGetSnapshot) {
    queue.getSnapshot = pauseState.originalGetSnapshot;
  }

  pausedQueueStates.delete(queue);
};

const pauseContextDependency = (contextDep: ContextDependency): void => {
  if (pausedContextStates.has(contextDep)) return;

  const frozenValue = contextDep.memoizedValue;
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    contextDep,
    "memoizedValue",
  );

  let valueDuringPause: unknown = null;
  let didReceiveValueDuringPause = false;

  const pauseState: PausedContextState = {
    originalDescriptor,
    frozenValue,
    getValueDuringPause: () => ({
      value: valueDuringPause,
      didReceive: didReceiveValueDuringPause,
    }),
  };

  Object.defineProperty(contextDep, "memoizedValue", {
    configurable: true,
    enumerable: true,
    get() {
      if (isUpdatesPaused) {
        return pauseState.frozenValue;
      }
      if (originalDescriptor?.get) {
        return originalDescriptor.get.call(this) as unknown;
      }
      return (this as unknown as { _memoizedValue?: unknown })._memoizedValue;
    },
    set(newValue) {
      if (isUpdatesPaused) {
        valueDuringPause = newValue;
        didReceiveValueDuringPause = true;
        return;
      }
      if (originalDescriptor?.set) {
        originalDescriptor.set.call(this, newValue);
      } else {
        (this as unknown as { _memoizedValue: unknown })._memoizedValue =
          newValue;
      }
    },
  });

  // HACK: Initialize backing field for non-getter properties to avoid undefined during cleanup race
  if (!originalDescriptor?.get) {
    (contextDep as unknown as { _memoizedValue: unknown })._memoizedValue =
      frozenValue;
  }

  pausedContextStates.set(contextDep, pauseState);
};

const resumeContextDependency = (contextDep: ContextDependency): void => {
  const pauseState = pausedContextStates.get(contextDep);
  if (!pauseState) return;

  const valueDuringPause = pauseState.getValueDuringPause?.();

  if (pauseState.originalDescriptor) {
    Object.defineProperty(
      contextDep,
      "memoizedValue",
      pauseState.originalDescriptor,
    );
  } else {
    delete (contextDep as unknown as Record<string, unknown>).memoizedValue;
  }

  if (valueDuringPause?.didReceive) {
    contextDep.memoizedValue = valueDuringPause.value;
  }

  pausedContextStates.delete(contextDep);
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
  callback: (contextDep: ContextDependency) => void,
): void => {
  if (!fiber.dependencies) return;

  let contextDep = fiber.dependencies.firstContext as ContextDependency | null;
  while (
    contextDep &&
    typeof contextDep === "object" &&
    "memoizedValue" in contextDep
  ) {
    callback(contextDep);
    contextDep = contextDep.next;
  }
};

const traverseFibers = (
  fiber: Fiber | null,
  onCompositeFiber: (fiber: Fiber) => void,
): void => {
  if (!fiber) return;

  if (isCompositeFiber(fiber)) {
    onCompositeFiber(fiber);
  }

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

// HACK: Wrap setState/dispatch to check isUpdatesPaused at CALL TIME, not creation time
// This catches setState calls from closures created before freeze was enabled
const createPausedDispatcher = (originalDispatcher: Dispatcher): Dispatcher => {
  return new Proxy(originalDispatcher, {
    get(target, prop, receiver): unknown {
      const originalMethod: unknown = Reflect.get(target, prop, receiver);

      if (prop === "useState" && typeof originalMethod === "function") {
        return <T>(
          initialState: T | (() => T),
        ): [T, (value: T | ((prev: T) => T)) => void] => {
          const [state, setState] = (
            originalMethod as <S>(
              init: S | (() => S),
            ) => [S, (v: S | ((p: S) => S)) => void]
          )(initialState);

          const wrappedSetState = (value: T | ((prev: T) => T)) => {
            if (isUpdatesPaused) {
              pendingStateUpdates.push(() => setState(value));
            } else {
              setState(value);
            }
          };

          return [state, wrappedSetState];
        };
      }

      if (prop === "useReducer" && typeof originalMethod === "function") {
        return <S, A>(
          reducer: (state: S, action: A) => S,
          initialState: S,
          init?: (s: S) => S,
        ): [S, (action: A) => void] => {
          const [state, dispatch] = (
            originalMethod as <St, Ac>(
              r: (s: St, a: Ac) => St,
              i: St,
              fn?: (s: St) => St,
            ) => [St, (a: Ac) => void]
          )(reducer, initialState, init);

          const wrappedDispatch = (action: A) => {
            if (isUpdatesPaused) {
              pendingStateUpdates.push(() => dispatch(action));
            } else {
              dispatch(action);
            }
          };

          return [state, wrappedDispatch];
        };
      }

      if (prop === "useSyncExternalStore") {
        return <T>(
          subscribe: (onStoreChange: () => void) => () => void,
          getSnapshot: () => T,
          getServerSnapshot?: () => T,
        ): T => {
          const pauseAwareSubscribe = (onStoreChange: () => void) => {
            return subscribe(() => {
              if (isUpdatesPaused) {
                pendingStoreChangeCallbacks.add(onStoreChange);
              } else {
                onStoreChange();
              }
            });
          };
          return (originalMethod as Dispatcher["useSyncExternalStore"])(
            pauseAwareSubscribe,
            getSnapshot,
            getServerSnapshot,
          );
        };
      }

      if (prop === "useTransition" && typeof originalMethod === "function") {
        return (...args: unknown[]): unknown => {
          const result = (originalMethod as (...args: unknown[]) => unknown)(
            ...args,
          );

          if (!Array.isArray(result) || result.length !== 2) {
            return result;
          }

          const [isPending, startTransition] = result as [
            boolean,
            (callback: () => void) => void,
          ];

          if (typeof startTransition !== "function") {
            return result;
          }

          return [
            isPending,
            (callback: () => void) => {
              if (isUpdatesPaused) {
                pendingTransitionCallbacks.push(() =>
                  startTransition(callback),
                );
              } else {
                startTransition(callback);
              }
            },
          ];
        };
      }

      return originalMethod;
    },
  });
};

const installDispatcherProxy = (renderer: ReactRenderer): void => {
  const dispatcherRef = renderer.currentDispatcherRef as DispatcherRef | null;
  if (!dispatcherRef || typeof dispatcherRef !== "object") return;
  if (pausedDispatcherStates.has(renderer)) return;

  const dispatcherKey: "H" | "current" = "H" in dispatcherRef ? "H" : "current";
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    dispatcherRef,
    dispatcherKey,
  );
  pausedDispatcherStates.set(renderer, { dispatcherKey, originalDescriptor });

  let currentDispatcherValue = dispatcherRef[dispatcherKey];

  Object.defineProperty(dispatcherRef, dispatcherKey, {
    configurable: true,
    enumerable: true,
    get: () => {
      return isUpdatesPaused && currentDispatcherValue
        ? createPausedDispatcher(currentDispatcherValue as Dispatcher)
        : currentDispatcherValue;
    },
    set: (newDispatcher) => {
      currentDispatcherValue = newDispatcher;
    },
  });
};

const uninstallDispatcherProxy = (renderer: ReactRenderer): void => {
  const pauseState = pausedDispatcherStates.get(renderer);
  if (!pauseState) return;

  const dispatcherRef = renderer.currentDispatcherRef as DispatcherRef | null;
  if (!dispatcherRef) return;

  if (pauseState.originalDescriptor) {
    Object.defineProperty(
      dispatcherRef,
      pauseState.dispatcherKey,
      pauseState.originalDescriptor,
    );
  } else {
    delete (dispatcherRef as Record<string, unknown>)[pauseState.dispatcherKey];
  }

  pausedDispatcherStates.delete(renderer);
};

const scheduleReactUpdate = (fiberRoots: Set<FiberRootLike>): void => {
  queueMicrotask(() => {
    try {
      const rdtHook = getRDTHook();
      for (const renderer of rdtHook.renderers.values()) {
        if (typeof renderer.scheduleUpdate !== "function") continue;

        for (const fiberRoot of fiberRoots) {
          if (!fiberRoot.current) continue;
          try {
            renderer.scheduleUpdate(fiberRoot.current);
          } catch {
            // HACK: Swallow errors to prevent cascade failures during cleanup
          }
        }
      }
    } catch {
      // HACK: Swallow errors to prevent cascade failures during cleanup
    }
  });
};

const safeInvokeCallbacks = (callbacks: Array<() => void>): void => {
  for (const callback of callbacks) {
    try {
      callback();
    } catch {
      // HACK: Swallow errors to prevent cascade failures during replay
    }
  }
};

const installReactFreeze = (): void => {
  const rdtHook = getRDTHook();
  for (const renderer of rdtHook.renderers.values()) {
    installDispatcherProxy(renderer);
  }

  const fiberRoots = collectFiberRoots();
  for (const fiberRoot of fiberRoots) {
    traverseFibers(fiberRoot.current, pauseFiber);
  }
};

const uninstallReactFreeze = (): Set<FiberRootLike> => {
  let collectedFiberRoots: Set<FiberRootLike> = new Set();

  try {
    collectedFiberRoots = collectFiberRoots();
    for (const fiberRoot of collectedFiberRoots) {
      traverseFibers(fiberRoot.current, resumeFiber);
    }
  } catch {
    // HACK: Swallow errors to prevent cascade failures during cleanup
  }

  try {
    for (const renderer of pausedDispatcherStates.keys()) {
      uninstallDispatcherProxy(renderer);
    }
  } catch {
    // HACK: Swallow errors to prevent cascade failures during cleanup
  }

  return collectedFiberRoots;
};

export const freezeUpdates = (): (() => void) => {
  if (isUpdatesPaused) {
    return () => {};
  }

  installReactFreeze();

  isUpdatesPaused = true;

  return () => {
    if (!isUpdatesPaused) return;

    isUpdatesPaused = false;

    const collectedFiberRoots = uninstallReactFreeze();

    const storeCallbacks = Array.from(pendingStoreChangeCallbacks);
    pendingStoreChangeCallbacks.clear();

    const transitionCallbacks = pendingTransitionCallbacks.slice();
    pendingTransitionCallbacks.length = 0;

    const stateUpdates = pendingStateUpdates.slice();
    pendingStateUpdates.length = 0;

    safeInvokeCallbacks(storeCallbacks);
    safeInvokeCallbacks(transitionCallbacks);
    safeInvokeCallbacks(stateUpdates);

    scheduleReactUpdate(collectedFiberRoots);
  };
};

export const areUpdatesFrozen = (): boolean => isUpdatesPaused;
