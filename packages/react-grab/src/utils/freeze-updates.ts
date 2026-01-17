import {
  _fiberRoots,
  getRDTHook,
  isCompositeFiber,
  type Fiber,
  type ReactRenderer,
} from "bippy";

interface FiberRootLike {
  current: Fiber | null;
}

const typedFiberRoots = _fiberRoots as Set<FiberRootLike>;

interface DispatcherRef {
  H?: unknown;
  current?: unknown;
}

interface Dispatcher {
  useState: <S>(
    initialState: S | (() => S),
  ) => [S, (action: S | ((prev: S) => S)) => void];
  useReducer: <S, A>(
    reducer: (state: S, action: A) => S,
    initialArg: S,
    init?: (arg: S) => S,
  ) => [S, (action: A) => void];
  useSyncExternalStore: <T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ) => T;
  [key: string]: unknown;
}

interface HookQueue {
  pending?: unknown;
  dispatch?: (...args: unknown[]) => void;
  lastRenderedReducer?: unknown;
  lanes?: number;
  value?: unknown;
  getSnapshot?: () => unknown;
}

interface HookState {
  memoizedState: unknown;
  baseState: unknown;
  baseQueue: unknown;
  queue: HookQueue | null;
  next: HookState | null;
}

interface PausedQueueState {
  originalPendingDescriptor?: PropertyDescriptor;
  originalGetSnapshot?: () => unknown;
  snapshotValueAtPause?: unknown;
}

interface PausedDispatcherState {
  dispatcherKey: "H" | "current";
  originalDescriptor: PropertyDescriptor | undefined;
}

let isUpdatesPaused = false;
const pausedDispatcherStates = new Map<ReactRenderer, PausedDispatcherState>();
const pausedQueueStates = new WeakMap<HookQueue, PausedQueueState>();

const pauseHookQueue = (queue: HookQueue): void => {
  if (!queue || pausedQueueStates.has(queue)) return;

  const queuePauseState: PausedQueueState = {};

  if ("pending" in queue) {
    queuePauseState.originalPendingDescriptor = Object.getOwnPropertyDescriptor(
      queue,
      "pending",
    );
    let currentPendingValue = queue.pending;

    Object.defineProperty(queue, "pending", {
      configurable: true,
      enumerable: true,
      get() {
        return currentPendingValue;
      },
      set(newValue) {
        if (isUpdatesPaused) return;
        currentPendingValue = newValue;
      },
    });
  }

  if ("getSnapshot" in queue && typeof queue.getSnapshot === "function") {
    queuePauseState.originalGetSnapshot = queue.getSnapshot;
    queuePauseState.snapshotValueAtPause = queue.getSnapshot();

    queue.getSnapshot = () => {
      if (isUpdatesPaused) {
        return queuePauseState.snapshotValueAtPause;
      }
      return queuePauseState.originalGetSnapshot!();
    };
  }

  pausedQueueStates.set(queue, queuePauseState);
};

const resumeHookQueue = (queue: HookQueue): void => {
  const queuePauseState = pausedQueueStates.get(queue);
  if (!queuePauseState) return;

  if (queuePauseState.originalPendingDescriptor) {
    const currentPendingValue = queue.pending;
    Object.defineProperty(
      queue,
      "pending",
      queuePauseState.originalPendingDescriptor,
    );
    if (
      !queuePauseState.originalPendingDescriptor.get &&
      !queuePauseState.originalPendingDescriptor.set
    ) {
      queue.pending = currentPendingValue;
    }
  } else if ("pending" in queue) {
    const currentPendingValue = queue.pending;
    delete (queue as Record<string, unknown>).pending;
    queue.pending = currentPendingValue;
  }

  if (queuePauseState.originalGetSnapshot) {
    queue.getSnapshot = queuePauseState.originalGetSnapshot;
  }

  pausedQueueStates.delete(queue);
};

const pauseFiberHookQueues = (fiber: Fiber): void => {
  let currentHookState = fiber.memoizedState as unknown as HookState | null;
  while (currentHookState) {
    if (currentHookState.queue && typeof currentHookState.queue === "object") {
      pauseHookQueue(currentHookState.queue);
    }
    currentHookState = currentHookState?.next ?? null;
  }
};

const resumeFiberHookQueues = (fiber: Fiber): void => {
  let currentHookState = fiber.memoizedState as unknown as HookState | null;
  while (currentHookState) {
    if (currentHookState.queue && typeof currentHookState.queue === "object") {
      resumeHookQueue(currentHookState.queue);
    }
    currentHookState = currentHookState?.next ?? null;
  }
};

const traverseAndPauseHookQueues = (fiber: Fiber | null): void => {
  if (!fiber) return;

  if (isCompositeFiber(fiber)) {
    pauseFiberHookQueues(fiber);
  }

  traverseAndPauseHookQueues(fiber.child);
  traverseAndPauseHookQueues(fiber.sibling);
};

const traverseAndResumeHookQueues = (fiber: Fiber | null): void => {
  if (!fiber) return;

  if (isCompositeFiber(fiber)) {
    resumeFiberHookQueues(fiber);
  }

  traverseAndResumeHookQueues(fiber.child);
  traverseAndResumeHookQueues(fiber.sibling);
};

const createPausedDispatcher = (originalDispatcher: Dispatcher): Dispatcher => {
  return new Proxy(originalDispatcher, {
    get(target, prop, receiver): unknown {
      const originalMethod: unknown = Reflect.get(target, prop, receiver);

      if (prop === "useState") {
        return <S>(
          initialState: S | (() => S),
        ): [S, (action: S | ((prev: S) => S)) => void] => {
          return (originalMethod as Dispatcher["useState"])(initialState);
        };
      }

      if (prop === "useReducer") {
        return <S, A>(
          reducer: (state: S, action: A) => S,
          initialArg: S,
          init?: (arg: S) => S,
        ): [S, (action: A) => void] => {
          return (originalMethod as Dispatcher["useReducer"])(
            reducer,
            initialArg,
            init,
          );
        };
      }

      if (prop === "useSyncExternalStore") {
        return <T>(
          subscribe: (onStoreChange: () => void) => () => void,
          getSnapshot: () => T,
          getServerSnapshot?: () => T,
        ): T => {
          const pauseAwareSubscribe = (onStoreChange: () => void) => {
            const pauseAwareCallback = () => {
              if (isUpdatesPaused) return;
              onStoreChange();
            };
            return subscribe(pauseAwareCallback);
          };
          return (originalMethod as Dispatcher["useSyncExternalStore"])(
            pauseAwareSubscribe,
            getSnapshot,
            getServerSnapshot,
          );
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

  const dispatcherKey: "H" | "current" =
    "H" in dispatcherRef ? "H" : "current";
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    dispatcherRef,
    dispatcherKey,
  );
  pausedDispatcherStates.set(renderer, { dispatcherKey, originalDescriptor });

  let currentDispatcherValue = dispatcherRef[dispatcherKey];

  Object.defineProperty(dispatcherRef, dispatcherKey, {
    configurable: true,
    enumerable: true,
    get() {
      if (isUpdatesPaused && currentDispatcherValue) {
        return createPausedDispatcher(currentDispatcherValue as Dispatcher);
      }
      return currentDispatcherValue;
    },
    set(newDispatcher) {
      currentDispatcherValue = newDispatcher;
    },
  });
};

const uninstallDispatcherProxy = (renderer: ReactRenderer): void => {
  const dispatcherPauseState = pausedDispatcherStates.get(renderer);
  if (!dispatcherPauseState) return;

  const dispatcherRef = renderer.currentDispatcherRef as DispatcherRef | null;
  if (!dispatcherRef) return;

  if (dispatcherPauseState.originalDescriptor) {
    Object.defineProperty(
      dispatcherRef,
      dispatcherPauseState.dispatcherKey,
      dispatcherPauseState.originalDescriptor,
    );
  } else {
    delete (dispatcherRef as Record<string, unknown>)[
      dispatcherPauseState.dispatcherKey
    ];
  }

  pausedDispatcherStates.delete(renderer);
};

export const freezeUpdates = (): (() => void) => {
  if (isUpdatesPaused) {
    return () => {};
  }

  const rdtHook = getRDTHook();

  for (const renderer of rdtHook.renderers.values()) {
    installDispatcherProxy(renderer);
  }

  for (const fiberRoot of typedFiberRoots) {
    traverseAndPauseHookQueues(fiberRoot.current);
  }

  isUpdatesPaused = true;

  return () => {
    if (!isUpdatesPaused) return;

    isUpdatesPaused = false;

    for (const fiberRoot of typedFiberRoots) {
      traverseAndResumeHookQueues(fiberRoot.current);
    }

    for (const renderer of rdtHook.renderers.values()) {
      uninstallDispatcherProxy(renderer);
    }
  };
};
