import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

// freeze-updates patches React's internal dispatcher and the fiber update
// queues via bippy. Mock bippy so a hand-built fiber tree + dispatcher can be
// driven deterministically in node, and mock the recoverable-error logger so
// the try/catch recovery arms can be asserted.
vi.mock("bippy", () => {
  const fiberRoots = new Set<unknown>();
  const renderers = new Map<unknown, unknown>();
  return {
    _fiberRoots: fiberRoots,
    getRDTHook: () => ({ renderers }),
    getFiberFromHostInstance: () => null,
    isCompositeFiber: (fiber: { isComposite?: boolean } | null) => Boolean(fiber?.isComposite),
  };
});

vi.mock("../src/utils/log-recoverable-error.js", () => ({
  logRecoverableError: vi.fn(),
}));

import { _fiberRoots, getRDTHook } from "bippy";
import { logRecoverableError } from "../src/utils/log-recoverable-error.js";
import { freezeUpdates } from "../src/utils/freeze-updates.js";

interface MockQueue {
  pending: unknown;
  dispatch: (action: unknown) => void;
}
interface MockHookState {
  queue: MockQueue | null;
  next: MockHookState | null;
}
interface MockContext {
  memoizedValue: unknown;
  next: MockContext | null;
}
interface MockFiber {
  isComposite: boolean;
  memoizedState: MockHookState | null;
  dependencies: { firstContext: MockContext | null } | null;
  child: MockFiber | null;
  sibling: MockFiber | null;
  return: MockFiber | null;
}
interface ChainNode {
  action: unknown;
  next: ChainNode;
}

const fiberRootsSet = _fiberRoots as unknown as Set<unknown>;
const renderersMap = getRDTHook().renderers as unknown as Map<unknown, unknown>;
const loggedRecoverable = vi.mocked(logRecoverableError);

const makeFiber = (over: Partial<MockFiber>): MockFiber => ({
  isComposite: true,
  memoizedState: null,
  dependencies: null,
  child: null,
  sibling: null,
  return: null,
  ...over,
});

const addRoot = (fiber: MockFiber): void => {
  fiberRootsSet.add({ current: fiber });
};

// React's update queue is a circular singly-linked list whose `pending` points
// at the LAST update and `pending.next` at the first.
const singleChain = (action: unknown): ChainNode => {
  const node = { action } as ChainNode;
  node.next = node;
  return node;
};

const multiChain = (actions: unknown[]): ChainNode => {
  const nodes = actions.map((action) => ({ action }) as ChainNode);
  for (let index = 0; index < nodes.length; index++) {
    nodes[index].next = nodes[(index + 1) % nodes.length];
  }
  return nodes[nodes.length - 1];
};

beforeEach(() => {
  fiberRootsSet.clear();
  renderersMap.clear();
  loggedRecoverable.mockClear();
});

describe("freezeUpdates lifecycle guards", () => {
  it("returns a no-op resume when called while already frozen", () => {
    addRoot(makeFiber({}));
    const resumeFirst = freezeUpdates();
    const resumeSecond = freezeUpdates();
    // The second call must not re-pause; its resume does nothing observable.
    expect(typeof resumeSecond).toBe("function");
    resumeSecond();
    resumeFirst();
    // A resume after everything is already unfrozen is also safe to call again.
    resumeFirst();
  });
});

describe("freezeUpdates hook-queue buffering", () => {
  it("freezes reads and replays every buffered update in chain order on resume", () => {
    const dispatched: unknown[] = [];
    const queue: MockQueue = { pending: null, dispatch: (action) => dispatched.push(action) };
    addRoot(makeFiber({ memoizedState: { queue, next: null } }));

    const resume = freezeUpdates();

    // While frozen, reads of `pending` are masked to null and writes are
    // buffered/merged instead of applied. Three writes exercise all
    // mergePendingChains arms: (null, single), (single, single), (multi, multi).
    expect(queue.pending).toBe(null);
    queue.pending = singleChain("a");
    queue.pending = singleChain("b");
    queue.pending = multiChain(["c", "d"]);
    expect(queue.pending).toBe(null);

    resume();

    expect(dispatched).toEqual(["a", "b", "c", "d"]);
  });

  it("replays the queue's pre-existing pending chain captured at freeze time", () => {
    const dispatched: unknown[] = [];
    const queue: MockQueue = {
      pending: multiChain(["x", "y"]),
      dispatch: (action) => dispatched.push(action),
    };
    addRoot(makeFiber({ memoizedState: { queue, next: null } }));

    const resume = freezeUpdates();
    resume();

    expect(dispatched).toEqual(["x", "y"]);
  });
});

describe("freezeUpdates context-dependency freezing", () => {
  it("masks the context value while frozen and applies the buffered value on resume", () => {
    const contextDependency: MockContext = { memoizedValue: "frozen", next: null };
    addRoot(makeFiber({ dependencies: { firstContext: contextDependency } }));

    const resume = freezeUpdates();

    expect(contextDependency.memoizedValue).toBe("frozen");
    contextDependency.memoizedValue = "next";
    expect(contextDependency.memoizedValue).toBe("frozen");

    resume();

    expect(contextDependency.memoizedValue).toBe("next");
  });
});

describe("freezeUpdates dispatcher patching and replay order", () => {
  it("replays store callbacks, then transitions, then state updates", () => {
    const order: string[] = [];
    const dispatcherObject = {
      useState: () => ["state", () => order.push("state")],
      useReducer: () => ["reducer", () => {}],
      useTransition: () => [
        false,
        (callback: () => void) => {
          order.push("transition");
          callback();
        },
      ],
      useSyncExternalStore: (
        subscribe: (onChange: () => void) => () => void,
        getSnapshot: () => unknown,
      ) => {
        subscribe(() => order.push("store"));
        return getSnapshot();
      },
    };
    const dispatcherRef = { H: dispatcherObject };
    renderersMap.set("r", { currentDispatcherRef: dispatcherRef, scheduleUpdate: vi.fn() });
    addRoot(makeFiber({}));

    const resume = freezeUpdates();

    // Accessing the ref's dispatcher triggers the lazy patch; the hooks below
    // are now the wrapped versions that buffer while frozen.
    const patched = dispatcherRef.H as typeof dispatcherObject;

    patched.useSyncExternalStore(
      (callback) => {
        callback();
        return () => {};
      },
      () => 0,
    );

    const [, startTransition] = patched.useTransition() as [boolean, (cb: () => void) => void];
    startTransition(() => {});

    const [, setState] = patched.useState() as [unknown, (action?: unknown) => void];
    setState();

    expect(order).toEqual([]);

    resume();

    expect(order).toEqual(["store", "transition", "state"]);
  });
});

describe("freezeUpdates recovery arms", () => {
  it("continues replaying after a buffered update throws and logs it", () => {
    const order: string[] = [];
    const dispatcherObject = {
      useState: () => ["s", () => {}],
      useReducer: () => ["r", () => {}],
      useTransition: () => [false, (cb: () => void) => cb()],
      useSyncExternalStore: (_s: unknown, getSnapshot: () => unknown) => getSnapshot(),
    };
    const dispatcherRef = { H: dispatcherObject };
    renderersMap.set("r", { currentDispatcherRef: dispatcherRef, scheduleUpdate: vi.fn() });

    const queue: MockQueue = {
      pending: null,
      dispatch: (action) => {
        if (action === "boom") throw new Error("dispatch failed");
        order.push(String(action));
      },
    };
    addRoot(makeFiber({ memoizedState: { queue, next: null } }));

    const resume = freezeUpdates();
    queue.pending = singleChain("boom");
    queue.pending = singleChain("ok");
    resume();

    expect(order).toEqual(["ok"]);
    expect(loggedRecoverable).toHaveBeenCalled();
    expect(loggedRecoverable.mock.calls[0][0]).toBe("Callback failed during state replay");
  });

  it("swallows and logs a scheduleUpdate failure during the post-resume flush", async () => {
    renderersMap.set("r", {
      currentDispatcherRef: { H: {} },
      scheduleUpdate: () => {
        throw new Error("scheduleUpdate failed");
      },
    });
    addRoot(makeFiber({}));

    const resume = freezeUpdates();
    resume();

    // scheduleReactUpdate runs in a microtask after resume.
    await Promise.resolve();
    await Promise.resolve();

    expect(loggedRecoverable).toHaveBeenCalledWith(
      "scheduleUpdate failed during unfreeze",
      expect.any(Error),
    );
  });
});
