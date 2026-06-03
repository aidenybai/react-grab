import { createSignal, type Accessor } from "solid-js";
import type {
  ArchivedEdit,
  ArchivedEdits,
  EditPanelState,
  EditTeardownReason,
  PendingEditsEntry,
  Position,
} from "../types.js";
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
  retarget: (element: Element, position: Position, overrides?: EditModeOverrides) => boolean;
  updateSource: (element: Element, filePath?: string, lineNumber?: number) => void;
  dismiss: () => void;
  closePreservingRenderer: () => void;
  submit: (prompt: string) => void;
  resetWithDiscard: () => void;
  teardownReason: Accessor<EditTeardownReason>;
  archive: (item: ArchivedEdit) => void;
  getArchived: () => ArchivedEdits;
  isOpen: Accessor<boolean>;
  isInteracting: Accessor<boolean>;
  setInteracting: (interacting: boolean) => void;
}

export const createEditModeController = (
  dependencies: EditModeDependencies,
): EditModeController => {
  const [state, setState] = createSignal<EditPanelState | null>(null);
  const [isInteracting, setIsInteracting] = createSignal(false);

  // Why the active panel will be torn down next. The panel reads this in its
  // cleanup to decide whether to keep its edits (retarget/submit) or revert
  // them (dismiss). Defaults to "dismiss" so any unexpected teardown reverts.
  const [teardownReason, setTeardownReason] = createSignal<EditTeardownReason>("dismiss");

  // Edits from elements the user switched away from during this session. Kept
  // applied and folded into the copied prompt; reverted together on discard.
  let archivedEntries: PendingEditsEntry[] = [];
  let archivedMovePrompts: string[] = [];
  let archivedRestores: Array<() => void> = [];

  const clearArchive = () => {
    archivedEntries = [];
    archivedMovePrompts = [];
    archivedRestores = [];
  };

  const restoreArchived = () => {
    // LIFO so re-inserted elements unwind in the reverse of how they stacked.
    for (let index = archivedRestores.length - 1; index >= 0; index -= 1) {
      archivedRestores[index]();
    }
    clearArchive();
  };

  const archive = (item: ArchivedEdit) => {
    const hasStyleEdits = item.entry.edits.length > 0;
    const hasMove = item.movePrompt.length > 0;
    if (!hasStyleEdits && !hasMove) return;
    if (hasStyleEdits) archivedEntries.push(item.entry);
    if (hasMove) archivedMovePrompts.push(item.movePrompt);
    archivedRestores.push(item.restore);
  };

  const getArchived = (): ArchivedEdits => ({
    entries: archivedEntries,
    movePrompts: archivedMovePrompts,
  });

  const clearAll = () => {
    const wasOpen = state() !== null;
    setState(null);
    setIsInteracting(false);
    if (wasOpen) dependencies.onClose?.();
  };

  const clearWithPreviewRestore = () => {
    // Revert everything: the active element's preview plus every element whose
    // edits were batched earlier in the session.
    setTeardownReason("dismiss");
    state()?.preview.restore();
    restoreArchived();
    clearAll();
  };

  const buildStateForElement = (
    element: Element,
    position: Position,
    overrides: EditModeOverrides,
  ): boolean => {
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
    return true;
  };

  const trigger = (
    element: Element,
    position: Position,
    overrides: EditModeOverrides = {},
  ): boolean => {
    // Re-entry would desync the existing preview from the panel's tweak store.
    if (state() !== null) return false;
    if (!buildStateForElement(element, position, overrides)) return false;
    dependencies.onOpen?.();
    return true;
  };

  // Switch the open panel to a different element (click-to-select another
  // element while styling). The current element's edits are batched (kept
  // applied and recorded for the copied prompt) rather than reverted, so a
  // session can accumulate tweaks across many elements. The renderer stays
  // active, so onOpen tracking keeps running rather than tearing down.
  const retarget = (
    element: Element,
    position: Position,
    overrides: EditModeOverrides = {},
  ): boolean => {
    const current = state();
    if (current?.element === element) return false;
    // Confirm the new element is editable before tearing down the current
    // selection — otherwise a non-editable target would batch the current
    // element's edits while leaving the panel pointed at it.
    if (buildEditableProperties(element).length === 0) return false;
    // The outgoing panel's cleanup reads this reason and archives its own
    // edits; restore to the default once the new panel is in place.
    setTeardownReason("retarget");
    const didRetarget = buildStateForElement(element, position, overrides);
    setTeardownReason("dismiss");
    return didRetarget;
  };

  const updateSource = (element: Element, filePath?: string, lineNumber?: number): void => {
    setState((current) => {
      if (!current || current.element !== element) return current;
      return { ...current, filePath, lineNumber };
    });
  };

  const submit = (prompt: string) => {
    const currentState = state();
    if (!currentState) return;
    const element = currentState.element;
    // Keep both the current and archived edits applied; the prompt already
    // folded the archive in, so drop it without reverting.
    setTeardownReason("submit");
    clearArchive();
    clearAll();
    setTeardownReason("dismiss");
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
    clearWithPreviewRestore();
    if (dependencies.store.wasActivatedByToggle) {
      dependencies.deactivateRenderer();
    } else {
      dependencies.actions.unfreeze();
    }
  };

  const closePreservingRenderer = () => {
    if (state() === null) return;
    clearWithPreviewRestore();
    dependencies.actions.unfreeze();
  };

  return {
    state,
    trigger,
    retarget,
    updateSource,
    dismiss,
    closePreservingRenderer,
    submit,
    resetWithDiscard: clearWithPreviewRestore,
    teardownReason,
    archive,
    getArchived,
    isOpen: () => state() !== null,
    isInteracting,
    setInteracting: setIsInteracting,
  };
};
