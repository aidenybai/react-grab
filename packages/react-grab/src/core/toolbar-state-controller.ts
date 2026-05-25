import { type Accessor, type Setter, createSignal } from "solid-js";
import { TOOLBAR_DEFAULT_POSITION_RATIO, DEFAULT_ACTION_ID } from "../constants.js";
import { loadToolbarState, saveToolbarState } from "../components/toolbar/state.js";
import type { ToolbarState } from "../types.js";

export interface ToolbarStateController {
  /** Reactive accessor for the current toolbar state (or null if unsaved). */
  current: Accessor<ToolbarState | null>;
  /** Direct setter for the signal; bypasses save + change-callback notification. */
  setCurrent: Setter<ToolbarState | null>;
  /** Read the latest saved toolbar state from storage. */
  load: () => ToolbarState | null;
  /**
   * Merge `updates` into the current state, persist to storage, push the
   * merged state into the signal, and notify all registered change callbacks.
   */
  update: (updates: Partial<ToolbarState>) => void;
  /** Persist `state` and update the signal *without* notifying change callbacks. */
  saveWithoutNotify: (state: ToolbarState) => void;
  /** Fire each registered change callback with `state`. */
  notify: (state: ToolbarState) => void;
  /** Subscribe to toolbar state changes; returns an unsubscribe. */
  onChange: (callback: (state: ToolbarState) => void) => () => void;
  /** Clear all change subscribers; called from api.dispose. */
  clearSubscribers: () => void;
}

/**
 * Owns the toolbar's persisted state (edge, ratio, collapsed, enabled,
 * defaultAction). The state is:
 *   - read from `loadToolbarState()` on construction
 *   - mirrored into a reactive signal so the renderer can react to it
 *   - merged + saved via `update()`
 *   - broadcast to plugin subscribers via `onChange()` callbacks
 */
export const createToolbarStateController = (): ToolbarStateController => {
  const subscribers = new Set<(state: ToolbarState) => void>();

  const saved = loadToolbarState();
  const [current, setCurrent] = createSignal<ToolbarState | null>(saved);

  const buildMergedState = (updates: Partial<ToolbarState>): ToolbarState => {
    const currentState = current() ?? loadToolbarState();
    return {
      edge: currentState?.edge ?? "bottom",
      ratio: currentState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
      collapsed: currentState?.collapsed ?? false,
      enabled: currentState?.enabled ?? true,
      defaultAction: currentState?.defaultAction ?? DEFAULT_ACTION_ID,
      ...updates,
    };
  };

  const notify = (state: ToolbarState) => {
    for (const callback of subscribers) {
      callback(state);
    }
  };

  const update = (updates: Partial<ToolbarState>) => {
    const newState = buildMergedState(updates);
    saveToolbarState(newState);
    setCurrent(newState);
    notify(newState);
  };

  const saveWithoutNotify = (state: ToolbarState) => {
    saveToolbarState(state);
    setCurrent(state);
  };

  const onChange = (callback: (state: ToolbarState) => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };

  const clearSubscribers = () => {
    subscribers.clear();
  };

  return {
    current,
    setCurrent,
    load: loadToolbarState,
    update,
    saveWithoutNotify,
    notify,
    onChange,
    clearSubscribers,
  };
};
