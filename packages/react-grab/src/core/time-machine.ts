import { createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import type { Position, TimeMachinePanelState, TimeMachineTimelineEntry } from "../types.js";
import { getTagName } from "../utils/get-tag-name.js";
import { getNearestComponentName } from "./context.js";
import {
  getTimeMachineCursor,
  getTimeMachineTimeline,
  setTimeMachinePanelOpen,
  subscribeToTimeMachineHistory,
  travelTimeMachineTo,
} from "./time-machine-recorder.js";

export interface TimeMachineTriggerOptions {
  element?: Element;
  componentName?: string;
  tagName?: string;
}

interface TimeMachineDependencies {
  store: {
    wasActivatedByToggle: boolean;
  };
  actions: {
    setPointer: (position: Position) => void;
    setFrozenElement: (element: Element) => void;
    freeze: () => void;
    unfreeze: () => void;
  };
  isActivated: Accessor<boolean>;
  activateRenderer: () => void;
  deactivateRenderer: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface TimeMachineController {
  state: Accessor<TimeMachinePanelState | null>;
  entries: Accessor<TimeMachineTimelineEntry[]>;
  cursor: Accessor<number>;
  trigger: (position: Position, options?: TimeMachineTriggerOptions) => boolean;
  travelTo: (cursor: number) => void;
  dismiss: () => void;
  closePreservingRenderer: () => void;
  reset: () => void;
  isOpen: Accessor<boolean>;
}

export const createTimeMachineController = (
  dependencies: TimeMachineDependencies,
): TimeMachineController => {
  const [state, setState] = createSignal<TimeMachinePanelState | null>(null);
  const [historyVersion, setHistoryVersion] = createSignal(0);
  // Element-scoped opens (context menu / shortcut) freeze the page like the
  // style panel does; toolbar opens are a lightweight utility that leaves the
  // app running live, so dismissal must not unfreeze or deactivate anything.
  let didFreezeOnOpen = false;

  const unsubscribeFromHistory = subscribeToTimeMachineHistory(() => {
    setHistoryVersion((version) => version + 1);
  });
  onCleanup(unsubscribeFromHistory);

  const entries = createMemo(() => {
    historyVersion();
    return getTimeMachineTimeline();
  });

  const cursor = createMemo(() => {
    historyVersion();
    return getTimeMachineCursor();
  });

  const resolveComponentNameIntoState = (element: Element) => {
    void getNearestComponentName(element).then((nearestComponentName) => {
      if (!nearestComponentName) return;
      setState((current) => {
        if (!current || current.element !== element || current.componentName) return current;
        return { ...current, componentName: nearestComponentName };
      });
    });
  };

  const trigger = (position: Position, options: TimeMachineTriggerOptions = {}): boolean => {
    if (state() !== null) return false;

    const element = options.element;
    setState({
      element,
      position,
      componentName: options.componentName,
      tagName: options.tagName ?? (element ? getTagName(element) : undefined),
    });

    setTimeMachinePanelOpen(true);
    didFreezeOnOpen = Boolean(element);

    if (element) {
      resolveComponentNameIntoState(element);
      // Order matters: actions.freeze() is a no-op unless the state machine
      // is already "active", so the renderer must activate first.
      if (!dependencies.isActivated()) {
        dependencies.activateRenderer();
      }
      dependencies.actions.setPointer(position);
      dependencies.actions.setFrozenElement(element);
      dependencies.actions.freeze();
    }

    dependencies.onOpen?.();
    return true;
  };

  // Dismissal keeps whatever point in time the user travelled to; the panel
  // is a viewport into history, not a transaction to roll back.
  const dismiss = () => {
    if (state() === null) return;
    setState(null);
    setTimeMachinePanelOpen(false);
    dependencies.onClose?.();
    if (!didFreezeOnOpen) return;
    if (dependencies.store.wasActivatedByToggle) {
      dependencies.deactivateRenderer();
    } else {
      dependencies.actions.unfreeze();
    }
  };

  const closePreservingRenderer = () => {
    if (state() === null) return;
    setState(null);
    setTimeMachinePanelOpen(false);
    dependencies.onClose?.();
    if (didFreezeOnOpen) {
      dependencies.actions.unfreeze();
    }
  };

  // For teardown paths that already handle deactivation/unfreezing themselves
  // (e.g. deactivateRenderer), only the panel state is cleared.
  const reset = () => {
    if (state() === null) return;
    setState(null);
    setTimeMachinePanelOpen(false);
    dependencies.onClose?.();
  };

  return {
    state,
    entries,
    cursor,
    trigger,
    travelTo: travelTimeMachineTo,
    dismiss,
    closePreservingRenderer,
    reset,
    isOpen: () => state() !== null,
  };
};
