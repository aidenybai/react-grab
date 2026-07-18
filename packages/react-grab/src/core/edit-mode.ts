import { createSignal, type Accessor } from "solid-js";
import type {
  DesignTokenResolver,
  EditPanelState,
  PendingEdits,
  PendingEditsEntry,
  Position,
  PreviewStyles,
} from "../types.js";
import { buildEditableProperties } from "../utils/build-editable-properties.js";
import { collectDesignTokens } from "../utils/collect-design-tokens.js";
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
  designTokens?: DesignTokenResolver;
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

interface EditModeController {
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

const toSessionRecord = (currentState: EditPanelState, edits: PendingEdits): EditSessionRecord => ({
  element: currentState.element,
  preview: currentState.preview,
  filePath: currentState.filePath ?? "",
  lineNumber: currentState.lineNumber ?? 0,
  edits,
  designTokens: currentState.designTokens,
});

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
      properties,
      preview: createPreviewStyles(element),
      filePath: resolvedFilePath,
      lineNumber: resolvedLineNumber,
      componentName: overrides.componentName,
      tagName: overrides.tagName ?? getTagName(element),
      initialSearchQuery: overrides.initialSearchQuery,
      designTokens: collectDesignTokens(element),
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
      sessionRecords.push(toSessionRecord(currentState, currentPendingEdits));
    }
    currentPendingEdits = [];

    setState({
      element,
      position,
      properties,
      preview: createPreviewStyles(element),
      tagName: getTagName(element),
      hasSessionEdits: sessionRecords.some((record) => record.edits.length > 0),
      designTokens: collectDesignTokens(element),
    });

    // The store's selection source still points at the previous element, so
    // the new element's source is resolved directly instead. Resolution is
    // async, so a fast switch can bank this element's record before it lands;
    // patch any already-recorded visit of this element too, not just live state.
    void resolveSource(element)
      .then((source) => {
        if (!source) return;
        for (const record of sessionRecords) {
          if (record.element === element && !record.filePath) {
            record.filePath = source.filePath;
            record.lineNumber = source.lineNumber ?? 0;
          }
        }
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

  const buildSessionRecords = (
    currentState: EditPanelState,
    pendingEdits: PendingEdits,
  ): EditSessionRecord[] => [...sessionRecords, toSessionRecord(currentState, pendingEdits)];

  const buildSessionEntries = (records: EditSessionRecord[]): PendingEditsEntry[] => {
    const entryByElement = new Map<Element, PendingEditsEntry>();
    for (const record of records) {
      if (record.edits.length === 0) continue;
      const existingEntry = entryByElement.get(record.element);
      if (existingEntry) {
        // A later visit may have resolved the source the first visit missed.
        if (!existingEntry.filePath && record.filePath) {
          existingEntry.filePath = record.filePath;
          existingEntry.lineNumber = record.lineNumber;
        }
        mergeEditsIntoEntry(existingEntry, record.edits);
        continue;
      }
      entryByElement.set(record.element, {
        filePath: record.filePath,
        lineNumber: record.lineNumber,
        edits: [...record.edits],
        designTokens: record.designTokens,
      });
    }
    return Array.from(entryByElement.values());
  };

  // Copy keeps the preview of every element whose edits made it into the
  // prompt, but a banked visit can hold preview styles with no net edits
  // (e.g. tweaked then stepped back to original). Those never reach the
  // prompt, so revert them like a discard would, or the page keeps stray
  // inline styles the copy never described.
  const restoreUneditedPreviews = (records: EditSessionRecord[]) => {
    const editedElements = new Set<Element>();
    for (const record of records) {
      if (record.edits.length > 0) editedElements.add(record.element);
    }
    for (let recordIndex = records.length - 1; recordIndex >= 0; recordIndex--) {
      const record = records[recordIndex];
      if (record.edits.length === 0 && !editedElements.has(record.element)) {
        record.preview.restore();
      }
    }
  };

  const submit = (pendingEdits: PendingEdits) => {
    const currentState = state();
    if (!currentState) return;
    const element = currentState.element;
    const records = buildSessionRecords(currentState, pendingEdits);
    const prompt = formatSessionEditsPrompt(buildSessionEntries(records));
    restoreUneditedPreviews(records);
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
