import { createSignal, type Accessor } from "solid-js";
import type {
  EditPanelState,
  PendingEdits,
  PendingEditsEntry,
  Position,
  PreviewStyles,
} from "../types.js";
import { buildEditableProperties } from "../utils/build-editable-properties.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { formatSessionEditsPrompt } from "../utils/format-edit-prompt.js";
import { getTagName } from "../utils/get-tag-name.js";
import { createPreviewStyles } from "../utils/preview-styles.js";
import { getNearestComponentName, resolveSource } from "./context.js";

export interface EditModeOverrides {
  filePath?: string;
  lineNumber?: number;
  componentName?: string;
  tagName?: string;
  initialSearchQuery?: string;
}

interface EditSessionRecord {
  element: Element;
  preview: PreviewStyles;
  filePath: string;
  lineNumber: number;
  edits: PendingEdits;
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
  switchToElement: (element: Element, position: Position) => boolean;
  setPendingEdits: (pendingEdits: PendingEdits) => void;
  dismiss: () => void;
  closePreservingRenderer: () => void;
  submit: (pendingEdits: PendingEdits) => void;
  resetWithDiscard: () => void;
  isOpen: Accessor<boolean>;
  isInteracting: Accessor<boolean>;
  setInteracting: (interacting: boolean) => void;
}

const mergeEditsIntoEntry = (entry: PendingEditsEntry, edits: PendingEdits) => {
  for (const edit of edits) {
    const sameKeyIndex = entry.edits.findIndex((existingEdit) => existingEdit.key === edit.key);
    if (sameKeyIndex >= 0) {
      entry.edits[sameKeyIndex] = edit;
    } else {
      entry.edits.push(edit);
    }
  }
};

export const createEditModeController = (
  dependencies: EditModeDependencies,
): EditModeController => {
  const [state, setState] = createSignal<EditPanelState | null>(null);
  const [isInteracting, setIsInteracting] = createSignal(false);
  let sessionRecords: EditSessionRecord[] = [];
  let currentPendingEdits: PendingEdits = [];

  const setPendingEdits = (pendingEdits: PendingEdits) => {
    currentPendingEdits = pendingEdits;
  };

  const clearAll = () => {
    const wasOpen = state() !== null;
    setState(null);
    setIsInteracting(false);
    sessionRecords = [];
    currentPendingEdits = [];
    if (wasOpen) dependencies.onClose?.();
  };

  const clearWithPreviewRestore = () => {
    state()?.preview.restore();
    for (let recordIndex = sessionRecords.length - 1; recordIndex >= 0; recordIndex--) {
      sessionRecords[recordIndex].preview.restore();
    }
    clearAll();
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

  const trigger = (
    element: Element,
    position: Position,
    overrides: EditModeOverrides = {},
  ): boolean => {
    // Re-entry would desync the existing preview from the panel's style store.
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

    resolveComponentNameIntoState(element);

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

  const switchToElement = (element: Element, position: Position): boolean => {
    const currentState = state();
    if (!currentState) return false;
    if (currentState.element === element) return false;
    const properties = buildEditableProperties(element);
    if (properties.length === 0) return false;

    if (currentPendingEdits.length > 0 || currentState.preview.hasAppliedStyles()) {
      sessionRecords.push({
        element: currentState.element,
        preview: currentState.preview,
        filePath: currentState.filePath ?? "",
        lineNumber: currentState.lineNumber ?? 0,
        edits: currentPendingEdits,
      });
    }
    currentPendingEdits = [];

    setState({
      element,
      position,
      selectionBounds: createElementBounds(element),
      properties,
      preview: createPreviewStyles(element),
      tagName: getTagName(element),
      hasSessionEdits: sessionRecords.some((record) => record.edits.length > 0),
    });

    // The store's selection source still points at the previous element, so
    // the new element's source is resolved directly instead.
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

    resolveComponentNameIntoState(element);

    dependencies.actions.setPointer(position);
    dependencies.actions.setFrozenElement(element);
    return true;
  };

  const buildSessionEntries = (
    currentState: EditPanelState,
    pendingEdits: PendingEdits,
  ): PendingEditsEntry[] => {
    const records: EditSessionRecord[] = [
      ...sessionRecords,
      {
        element: currentState.element,
        preview: currentState.preview,
        filePath: currentState.filePath ?? "",
        lineNumber: currentState.lineNumber ?? 0,
        edits: pendingEdits,
      },
    ];

    const entryByElement = new Map<Element, PendingEditsEntry>();
    for (const record of records) {
      if (record.edits.length === 0) continue;
      const existingEntry = entryByElement.get(record.element);
      if (existingEntry) {
        mergeEditsIntoEntry(existingEntry, record.edits);
        continue;
      }
      entryByElement.set(record.element, {
        filePath: record.filePath,
        lineNumber: record.lineNumber,
        edits: [...record.edits],
      });
    }
    return Array.from(entryByElement.values());
  };

  const submit = (pendingEdits: PendingEdits) => {
    const currentState = state();
    if (!currentState) return;
    const element = currentState.element;
    const prompt = formatSessionEditsPrompt(buildSessionEntries(currentState, pendingEdits));
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
    switchToElement,
    setPendingEdits,
    dismiss,
    closePreservingRenderer,
    submit,
    resetWithDiscard: clearWithPreviewRestore,
    isOpen: () => state() !== null,
    isInteracting,
    setInteracting: setIsInteracting,
  };
};
