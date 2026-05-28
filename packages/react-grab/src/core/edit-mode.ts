import { createSignal, type Accessor } from "solid-js";
import type { EditPanelState, Position } from "../types.js";
import { buildEditableProperties } from "../utils/build-editable-properties.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getTagName } from "../utils/get-tag-name.js";
import { createPreviewStyles } from "../utils/preview-styles.js";
import { getNearestComponentName } from "./context.js";

export interface EditModeOverrides {
  filePath?: string;
  lineNumber?: number;
  componentName?: string;
  tagName?: string;
  initialSearchQuery?: string;
}

interface EditModeDependencies {
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

export interface EditModeController {
  state: Accessor<EditPanelState | null>;
  trigger: (element: Element, position: Position, overrides?: EditModeOverrides) => boolean;
  dismiss: () => void;
  closePreservingRenderer: () => void;
  submit: (prompt: string) => void;
  resetWithDiscard: () => void;
  isOpen: Accessor<boolean>;
  isInteracting: Accessor<boolean>;
  setInteracting: (interacting: boolean) => void;
}

export const createEditModeController = (
  dependencies: EditModeDependencies,
): EditModeController => {
  const [state, setState] = createSignal<EditPanelState | null>(null);
  const [isInteracting, setIsInteracting] = createSignal(false);

  const clearAll = () => {
    const wasOpen = state() !== null;
    setState(null);
    setIsInteracting(false);
    if (wasOpen) dependencies.onClose?.();
  };

  const resetWithDiscard = () => {
    state()?.preview.restore();
    clearAll();
  };

  const trigger = (
    element: Element,
    position: Position,
    overrides: EditModeOverrides = {},
  ): boolean => {
    // Re-entry would desync the existing preview from the panel's tweak store.
    if (state() !== null) return false;
    const properties = buildEditableProperties(element);
    if (properties.length === 0) return false;

    const resolvedFilePath =
      overrides.filePath ?? dependencies.store.selectionFilePath ?? undefined;
    const resolvedLineNumber =
      overrides.lineNumber ?? dependencies.store.selectionLineNumber ?? undefined;

    setState({
      element,
      position,
      selectionBounds: createElementBounds(element),
      properties,
      preview: createPreviewStyles(element),
      filePath: resolvedFilePath,
      lineNumber: resolvedLineNumber,
      componentName: overrides.componentName,
      tagName: overrides.tagName ?? getTagName(element),
      initialSearchQuery: overrides.initialSearchQuery,
    });

    void getNearestComponentName(element).then((nearestComponentName) => {
      if (!nearestComponentName) return;
      setState((current) => {
        if (!current || current.element !== element || current.componentName) return current;
        return { ...current, componentName: nearestComponentName };
      });
    });

    // Order matters: actions.freeze() is a no-op unless the state machine
    // is already "active", so the renderer must activate first.
    if (!dependencies.isActivated()) {
      dependencies.activateRenderer();
    }
    dependencies.actions.setPointer(position);
    dependencies.actions.setFrozenElement(element);
    dependencies.actions.freeze();
    dependencies.onOpen?.();
    return true;
  };

  const submit = (prompt: string) => {
    const currentState = state();
    if (!currentState) return;
    const element = currentState.element;
    clearAll();
    if (!dependencies.store.wasActivatedByToggle) {
      dependencies.actions.unfreeze();
    }
    dependencies.performCopyWithLabel({
      element,
      cursorX: currentState.position.x,
      extraPrompt: prompt || undefined,
      shouldDeactivateAfter: dependencies.store.wasActivatedByToggle,
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

  return {
    state,
    trigger,
    dismiss,
    closePreservingRenderer,
    submit,
    resetWithDiscard,
    isOpen: () => state() !== null,
    isInteracting,
    setInteracting: setIsInteracting,
  };
};
