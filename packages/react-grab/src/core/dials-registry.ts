import { createStore } from "solid-js/store";
import type { DialPanelInput, DialPanelRuntime, DialValue } from "../types.js";
import { collectDialDefaults } from "../utils/resolve-dial-values.js";

interface DialsStoreState {
  panels: DialPanelRuntime[];
}

export interface DialsRegistry {
  store: DialsStoreState;
  register: (panel: DialPanelInput) => () => void;
  unregister: (id: string) => void;
  setValue: (id: string, path: string, value: DialValue) => void;
  setValues: (id: string, values: Record<string, DialValue>) => void;
  reset: (id: string) => void;
  getValues: (id: string) => Record<string, DialValue> | null;
  subscribe: (id: string, callback: () => void) => () => void;
  triggerAction: (id: string, path: string) => void;
}

export const createDialsRegistry = (): DialsRegistry => {
  const [store, setStore] = createStore<DialsStoreState>({ panels: [] });
  // React reads these immutable snapshots via useSyncExternalStore. The Solid
  // store mutates valuesByPath in place (so its proxy keeps a stable identity
  // for fine-grained UI reactivity), which would never trip React's snapshot
  // equality - so a fresh plain object is published here on every change.
  const snapshotById = new Map<string, Record<string, DialValue>>();
  const listenersById = new Map<string, Set<() => void>>();
  const defaultsById = new Map<string, Record<string, DialValue>>();

  const indexOf = (id: string): number => store.panels.findIndex((panel) => panel.id === id);

  const notify = (id: string) => {
    const listeners = listenersById.get(id);
    if (!listeners) return;
    for (const listener of listeners) listener();
  };

  const publishSnapshot = (id: string, values: Record<string, DialValue>) => {
    snapshotById.set(id, { ...values });
    notify(id);
  };

  const register = (panel: DialPanelInput): (() => void) => {
    const defaults = collectDialDefaults(panel.controls);
    defaultsById.set(panel.id, defaults);
    const existingIndex = indexOf(panel.id);
    const previousValues =
      existingIndex >= 0 ? store.panels[existingIndex].valuesByPath : undefined;

    // Config merge: keep current values for paths that survive, drop removed.
    const mergedValues: Record<string, DialValue> = {};
    for (const path of Object.keys(defaults)) {
      mergedValues[path] =
        previousValues && path in previousValues ? previousValues[path] : defaults[path];
    }

    const runtime: DialPanelRuntime = {
      id: panel.id,
      name: panel.name,
      controls: panel.controls,
      valuesByPath: mergedValues,
      onAction: panel.onAction,
    };

    if (existingIndex >= 0) {
      setStore("panels", existingIndex, runtime);
    } else {
      setStore("panels", store.panels.length, runtime);
    }
    publishSnapshot(panel.id, mergedValues);

    return () => unregister(panel.id);
  };

  const unregister = (id: string) => {
    const existingIndex = indexOf(id);
    if (existingIndex < 0) return;
    setStore("panels", (panels) => panels.filter((panel) => panel.id !== id));
    snapshotById.delete(id);
    defaultsById.delete(id);
    listenersById.delete(id);
  };

  const setValue = (id: string, path: string, value: DialValue) => {
    const existingIndex = indexOf(id);
    if (existingIndex < 0) return;
    setStore("panels", existingIndex, "valuesByPath", path, value);
    publishSnapshot(id, store.panels[existingIndex].valuesByPath);
  };

  const setValues = (id: string, values: Record<string, DialValue>) => {
    const existingIndex = indexOf(id);
    if (existingIndex < 0) return;
    for (const path of Object.keys(values)) {
      setStore("panels", existingIndex, "valuesByPath", path, values[path]);
    }
    publishSnapshot(id, store.panels[existingIndex].valuesByPath);
  };

  const reset = (id: string) => {
    const defaults = defaultsById.get(id);
    if (!defaults) return;
    setValues(id, defaults);
  };

  const getValues = (id: string): Record<string, DialValue> | null => snapshotById.get(id) ?? null;

  const subscribe = (id: string, callback: () => void): (() => void) => {
    let listeners = listenersById.get(id);
    if (!listeners) {
      listeners = new Set();
      listenersById.set(id, listeners);
    }
    listeners.add(callback);
    return () => {
      listeners?.delete(callback);
    };
  };

  const triggerAction = (id: string, path: string) => {
    const panel = store.panels[indexOf(id)];
    panel?.onAction?.(path);
  };

  return {
    store,
    register,
    unregister,
    setValue,
    setValues,
    reset,
    getValues,
    subscribe,
    triggerAction,
  };
};
