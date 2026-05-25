import { createSignal, type Accessor } from "solid-js";
import type { EditPanelState, Position } from "../types.js";
import { buildEditableProperties } from "../utils/build-editable-properties.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getTagName } from "../utils/get-tag-name.js";
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
}

export interface EditModeController {
  state: Accessor<EditPanelState | null>;
  trigger: (element: Element, position: Position, overrides?: EditModeOverrides) => boolean;
  dismiss: () => void;
  submit: (prompt: string) => void;
  // Forced close path — clears panel state AND reverts any in-progress
  // preview-style writes via the registered force-discard hook. Used
  // when the larger lifecycle (e.g. deactivateRenderer) tears things
  // down and the user lost control of the panel mid-edit; without
  // the revert, inline preview styles would strand on the DOM.
  // Distinct from `dismiss`/`submit`, which preserve preview styles
  // (those are user-initiated commits / stash-for-later).
  reset: () => void;
  isOpen: Accessor<boolean>;
  // The panel registers a callback that reverts in-progress preview
  // styles. Called from `reset()` before state is cleared so the
  // restore can read the panel's baseline map before unmount.
  registerForceDiscard: (discard: (() => void) | null) => void;
  // True while the user is actively stepping a value (keyboard or pointer).
  // Page-level selection overlay reads this to hide itself so the live
  // preview reads cleanly underneath.
  isInteracting: Accessor<boolean>;
  setInteracting: (interacting: boolean) => void;
}

export const createEditModeController = (
  dependencies: EditModeDependencies,
): EditModeController => {
  const [state, setState] = createSignal<EditPanelState | null>(null);
  const [isInteracting, setIsInteracting] = createSignal(false);
  let forceDiscardPreview: (() => void) | null = null;

  const registerForceDiscard = (discard: (() => void) | null) => {
    forceDiscardPreview = discard;
  };

  const clearAll = () => {
    setState(null);
    setIsInteracting(false);
  };

  // Force-revert + clear. Used by deactivateRenderer / unmount paths
  // where the user lost control of the panel and any in-progress
  // preview styles should NOT survive on the DOM. User-initiated
  // dismiss + submit deliberately do NOT call this (they preserve).
  const resetWithDiscard = () => {
    forceDiscardPreview?.();
    clearAll();
  };

  const trigger = (
    element: Element,
    position: Position,
    overrides: EditModeOverrides = {},
  ): boolean => {
    // Re-entry would tear down + remount the panel body, destroying
    // the in-memory tweak store while inline-style previews stay on
    // the DOM (the panel's onCleanup runs `preview.forget`, not
    // `restore`). Callers should dismiss the open panel first.
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
      filePath: resolvedFilePath,
      lineNumber: resolvedLineNumber,
      componentName: overrides.componentName,
      tagName: overrides.tagName ?? getTagName(element),
      initialSearchQuery: overrides.initialSearchQuery,
    });

    void getNearestComponentName(element).then((nearestName) => {
      if (!nearestName) return;
      setState((current) => {
        if (!current || current.element !== element || current.componentName) return current;
        return { ...current, componentName: nearestName };
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
    return true;
  };

  const submit = (prompt: string) => {
    const currentState = state();
    if (!currentState) return;
    const element = currentState.element;
    // Clear state first so the renderer hides EditPanel before the
    // copy-feedback label takes over the same anchor position.
    clearAll();
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

  return {
    state,
    trigger,
    dismiss,
    submit,
    reset: resetWithDiscard,
    isOpen: () => state() !== null,
    registerForceDiscard,
    isInteracting,
    setInteracting: setIsInteracting,
  };
};
