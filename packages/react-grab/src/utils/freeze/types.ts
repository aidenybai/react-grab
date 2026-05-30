import type { Fiber, FiberRoot } from "bippy";

export interface FiberRootLike extends FiberRoot {
  current: Fiber | null;
}

export interface PendingUpdate {
  next: PendingUpdate | null;
  action: unknown;
  [key: string]: unknown;
}

export interface HookQueue {
  pending?: unknown;
  dispatch?: ((...args: unknown[]) => void) | null;
  getSnapshot?: () => unknown;
}

export interface HookState {
  queue: HookQueue | null;
  next: HookState | null;
}

export interface ContextDependency {
  memoizedValue: unknown;
  next: ContextDependency | null;
}

export interface PausedQueueState {
  originalGetSnapshot?: () => unknown;
  snapshotValueAtPause?: unknown;
  originalPendingDescriptor?: PropertyDescriptor;
  pendingValueAtPause?: PendingUpdate | null;
  bufferedPending?: PendingUpdate | null;
}

export interface PausedContextState {
  originalDescriptor?: PropertyDescriptor;
  frozenValue: unknown;
  pendingValue?: unknown;
  didReceivePendingValue?: boolean;
}

export type DispatchFunction = (...args: unknown[]) => void;
export type TransitionFunction = (callback: () => void) => void;

export interface OriginalHooks {
  useState: DispatchFunction;
  useReducer: DispatchFunction;
  useTransition: DispatchFunction;
  useSyncExternalStore: DispatchFunction;
}
