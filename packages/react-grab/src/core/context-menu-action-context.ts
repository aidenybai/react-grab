import { type Accessor, createMemo, createResource } from "solid-js";
import { createComponentNameForElement } from "../utils/create-component-name-for-element.js";
import { resolveSource, type ResolvedSource } from "./context.js";
import type { ActionContextBuilder } from "./action-context-builder.js";
import type { ContextMenuActionContext, Position } from "../types.js";
import type { LabelInstanceManager } from "./label-instance-manager.js";
import type { GrabStoreHandle } from "./store.js";


interface ContextMenuActionContextInputs {
  grab: GrabStoreHandle;
  actionContextBuilder: ActionContextBuilder;
  labelManager: LabelInstanceManager;
  pointer: Accessor<Position>;
  contextMenuTagName: Accessor<string | undefined>;
  /**
   * Setter for the shared `keyboardSelectedElement` flag — cleared before
   * a context-menu action copies, so the post-copy renderer mount doesn't
   * snap the selection back to the keyboard-selected anchor.
   */
  clearKeyboardSelectedElement: () => void;
}

export interface ContextMenuActionContextBundle {
  /** Reactive component-name resolved from the context-menu target element. */
  contextMenuComponentName: Accessor<string | undefined>;
  /** Reactive source-info (file + line) resolved from the context-menu target. */
  contextMenuFilePath: Accessor<ResolvedSource | null | undefined>;
  /**
   * Built ActionContext fed to the renderer for the context-menu actions
   * row. Recomputes whenever the target element, source resolution, tag
   * name, or pointer position changes.
   */
  contextMenuActionContext: Accessor<ContextMenuActionContext | undefined>;
}

/**
 * Bundles the 3 reactive primitives that derive the renderer-facing
 * context-menu action-context payload from the current contextMenuElement.
 */
export const createContextMenuActionContext = (
  input: ContextMenuActionContextInputs,
): ContextMenuActionContextBundle => {
  const {
    grab,
    actionContextBuilder,
    labelManager,
    pointer,
    contextMenuTagName,
    clearKeyboardSelectedElement,
  } = input;
  const { store, actions } = grab;
  const { buildActionContext, deferHideContextMenu } = actionContextBuilder;
  const { clearAllLabels } = labelManager;

  const [contextMenuComponentName] = createComponentNameForElement(() =>
    store.frozenElements.length > 1 ? null : store.contextMenuElement,
  );

  const [contextMenuFilePath] = createResource(
    () => store.contextMenuElement,
    async (element) => {
      if (!element) return null;
      return resolveSource(element);
    },
  );

  const contextMenuActionContext = createMemo((): ContextMenuActionContext | undefined => {
    const element = store.contextMenuElement;
    if (!element) return undefined;
    const fileInfo = contextMenuFilePath();
    const position = store.contextMenuPosition ?? pointer();

    return buildActionContext({
      mode: "context-menu",
      element,
      filePath: fileInfo?.filePath ?? undefined,
      lineNumber: fileInfo?.lineNumber ?? undefined,
      tagName: contextMenuTagName(),
      componentName: contextMenuComponentName(),
      position,
      onBeforeCopy: clearKeyboardSelectedElement,
      customEnterPromptMode: () => {
        clearAllLabels();
        actions.clearInputText();
        actions.enterPromptMode(position, element);
        deferHideContextMenu();
      },
    });
  });

  return { contextMenuComponentName, contextMenuFilePath, contextMenuActionContext };
};
