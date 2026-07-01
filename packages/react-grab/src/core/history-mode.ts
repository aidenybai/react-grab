import { createSignal, type Accessor } from "solid-js";
import {
  getFiberFromHostInstance,
  getFiberId,
  isCompositeFiber,
  traverseFiber,
  type Fiber,
} from "bippy";
import { HISTORY_MAX_MOMENTS } from "../constants.js";
import type { HistoryMoment, HistoryPanelState, Position } from "../types.js";
import { clampToRange } from "../utils/clamp-to-range.js";
import { formatHistoryPrompt } from "../utils/format-history-prompt.js";
import { getTagName } from "../utils/get-tag-name.js";
import { getNearestComponentName, resolveSource } from "./context.js";
import { getRenderHistoryEntries } from "./render-history.js";

export interface HistoryModeOverrides {
  filePath?: string;
  lineNumber?: number;
  componentName?: string;
  tagName?: string;
}

interface HistoryModeDependencies {
  store: {
    selectionFilePath: string | null;
    selectionLineNumber: number | null;
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
  performCopyWithLabel: (options: {
    element: Element;
    cursorX: number;
    extraPrompt?: string;
    shouldDeactivateAfter: boolean;
  }) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface HistoryModeController {
  state: Accessor<HistoryPanelState | null>;
  trigger: (element: Element, position: Position, overrides?: HistoryModeOverrides) => boolean;
  step: (direction: 1 | -1) => void;
  dismiss: () => void;
  closePreservingRenderer: () => void;
  reset: () => void;
  submit: () => void;
  isOpen: Accessor<boolean>;
}

const findComponentFiber = (element: Element): Fiber | null => {
  const hostFiber = getFiberFromHostInstance(element);
  if (!hostFiber) return null;
  if (isCompositeFiber(hostFiber)) return hostFiber;
  return traverseFiber(hostFiber, (fiber) => isCompositeFiber(fiber), true);
};

const collectMoments = (targetFiberId: number, targetDisplayName: string): HistoryMoment[] => {
  const byId: HistoryMoment[] = [];
  const byName: HistoryMoment[] = [];
  for (const entry of getRenderHistoryEntries()) {
    const matchedById = entry.fibers.find((fiber) => fiber.fiberId === targetFiberId);
    if (matchedById) {
      byId.push({ id: entry.id, timestamp: entry.timestamp, changes: matchedById.changes });
      continue;
    }
    const matchedByName = entry.fibers.find((fiber) => fiber.displayName === targetDisplayName);
    if (matchedByName) {
      byName.push({ id: entry.id, timestamp: entry.timestamp, changes: matchedByName.changes });
    }
  }
  // Fiber identity is the precise signal; the display-name pass only fills in
  // when a remount changed the id, so it's a fallback rather than a merge.
  const moments = byId.length > 0 ? byId : byName;
  if (moments.length > HISTORY_MAX_MOMENTS) {
    return moments.slice(moments.length - HISTORY_MAX_MOMENTS);
  }
  return moments;
};

export const createHistoryModeController = (
  dependencies: HistoryModeDependencies,
): HistoryModeController => {
  const [state, setState] = createSignal<HistoryPanelState | null>(null);

  const clearAll = () => {
    const wasOpen = state() !== null;
    setState(null);
    if (wasOpen) dependencies.onClose?.();
  };

  const resolveComponentNameIntoState = (element: Element) => {
    void getNearestComponentName(element).then((nearestComponentName) => {
      if (!nearestComponentName) return;
      setState((current) => {
        if (!current || current.element !== element || current.componentName) return current;
        return { ...current, componentName: nearestComponentName };
      });
    });
  };

  const resolveSourceIntoState = (element: Element) => {
    void resolveSource(element)
      .then((source) => {
        if (!source) return;
        setState((current) => {
          if (!current || current.element !== element || current.filePath) return current;
          return {
            ...current,
            filePath: source.filePath,
            lineNumber: source.lineNumber ?? undefined,
          };
        });
      })
      .catch(() => undefined);
  };

  const trigger = (
    element: Element,
    position: Position,
    overrides: HistoryModeOverrides = {},
  ): boolean => {
    if (state() !== null) return false;
    const componentFiber = findComponentFiber(element);
    if (!componentFiber) return false;

    const targetFiberId = getFiberId(componentFiber);
    const componentName = overrides.componentName;
    const moments = collectMoments(targetFiberId, componentName ?? "");

    setState({
      element,
      position,
      componentName,
      tagName: overrides.tagName ?? getTagName(element),
      filePath: overrides.filePath ?? dependencies.store.selectionFilePath ?? undefined,
      lineNumber: overrides.lineNumber ?? dependencies.store.selectionLineNumber ?? undefined,
      moments,
      cursor: Math.max(0, moments.length - 1),
    });

    if (!componentName) resolveComponentNameIntoState(element);
    if (!overrides.filePath && dependencies.store.selectionFilePath === null) {
      resolveSourceIntoState(element);
    }

    if (!dependencies.isActivated()) {
      dependencies.activateRenderer();
    }
    dependencies.actions.setPointer(position);
    dependencies.actions.setFrozenElement(element);
    dependencies.actions.freeze();
    dependencies.onOpen?.();
    return true;
  };

  const step = (direction: 1 | -1) => {
    setState((current) => {
      if (!current || current.moments.length === 0) return current;
      const nextCursor = clampToRange(current.cursor + direction, 0, current.moments.length - 1);
      if (nextCursor === current.cursor) return current;
      return { ...current, cursor: nextCursor };
    });
  };

  const dismiss = () => {
    if (state() === null) return;
    clearAll();
    if (dependencies.store.wasActivatedByToggle) {
      dependencies.deactivateRenderer();
    } else {
      dependencies.actions.unfreeze();
    }
  };

  const closePreservingRenderer = () => {
    if (state() === null) return;
    clearAll();
    dependencies.actions.unfreeze();
  };

  const submit = () => {
    const currentState = state();
    if (!currentState) return;
    const moment = currentState.moments[currentState.cursor];
    const element = currentState.element;
    const cursorX = currentState.position.x;
    const componentName = currentState.componentName ?? currentState.tagName ?? "Component";
    const prompt = moment ? formatHistoryPrompt(componentName, moment) : undefined;
    clearAll();
    if (!dependencies.store.wasActivatedByToggle) {
      dependencies.actions.unfreeze();
    }
    dependencies.performCopyWithLabel({
      element,
      cursorX,
      extraPrompt: prompt,
      shouldDeactivateAfter: dependencies.store.wasActivatedByToggle,
    });
  };

  return {
    state,
    trigger,
    step,
    dismiss,
    closePreservingRenderer,
    reset: clearAll,
    submit,
    isOpen: () => state() !== null,
  };
};
