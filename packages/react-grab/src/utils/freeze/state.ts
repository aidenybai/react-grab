import type { ReactRenderer } from "bippy";
import type {
  ContextDependency,
  DispatchFunction,
  HookQueue,
  OriginalHooks,
  PausedContextState,
  PausedQueueState,
  TransitionFunction,
} from "./types.js";

/**
 * Shared mutable state for the freeze-updates system. Exposed as a single
 * mutable singleton so the sub-modules (dispatcher patching, hook-queue
 * pause/resume, context-dep pause/resume, orchestrator) can read and write
 * the same flag/maps/queues without each maintaining its own copy.
 *
 * The flag is wrapped in an object instead of being a free `let` because
 * ES module bindings export a snapshot — writes from one module would not
 * be visible to readers in another if it were a plain variable.
 */
export const freezeState = {
  /** Master flag: true while the freeze is in effect. */
  isUpdatesPaused: false,
};

/** Replay queues. Populated while paused; flushed in order during unfreeze. */
export const pendingStoreCallbacks = new Set<() => void>();
export const pendingTransitionCallbacks: Array<() => void> = [];
export const pendingStateUpdates: Array<() => void> = [];

/** Per-hook-queue pause state (descriptor + buffered actions). */
export const pausedQueueStates = new WeakMap<HookQueue, PausedQueueState>();

/** Per-context-dependency pause state (descriptor + frozen value). */
export const pausedContextStates = new WeakMap<ContextDependency, PausedContextState>();

/** Renderers whose dispatcher refs we've already patched, so we don't double-patch. */
export const renderersWithPatchedDispatcher = new WeakSet<ReactRenderer>();

/** Original hook functions saved off when we patch a dispatcher object. */
export const patchedDispatchers = new WeakMap<object, OriginalHooks>();

/** Cached wrapped versions of useState/useReducer dispatch functions. */
export const wrappedDispatchCache = new WeakMap<DispatchFunction, DispatchFunction>();

/** Cached wrapped versions of useTransition's startTransition function. */
export const wrappedStartTransitionCache = new WeakMap<TransitionFunction, TransitionFunction>();

export const getOrCache = <K extends object, V>(
  cache: WeakMap<K, V>,
  key: K,
  create: () => V,
): V => {
  const cached = cache.get(key);
  if (cached) return cached;
  const value = create();
  cache.set(key, value);
  return value;
};
