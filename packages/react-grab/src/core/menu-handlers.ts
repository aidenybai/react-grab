import { type Accessor } from "solid-js";
import { DEFAULT_ACTION_ID } from "../constants.js";
import { createBoundsFromDragRect } from "../utils/create-bounds-from-drag-rect.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { createPageRectFromBounds } from "../utils/create-bounds-from-drag-rect.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { getTagName } from "../utils/get-tag-name.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import type { Position } from "../types.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { ActionContextBuilder } from "./action-context-builder.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabPhaseSelectors } from "./selectors.js";
import type { ToolbarMenuController } from "./toolbar-menu-controller.js";
import type { ToolbarStateController } from "./toolbar-state-controller.js";

// Ensure unused import warning is silenced even though it's referenced only via re-export type sigs.
void createBoundsFromDragRect;

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface MenuHandlersInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  actionContextBuilder: ActionContextBuilder;
  activationLifecycle: ActivationLifecycle;
  toolbarMenu: ToolbarMenuController;
  toolbarStateController: ToolbarStateController;
  resolvedComponentName: Accessor<string | undefined>;
  /** Get the pending-default-action id and clear it (single-shot read+reset). */
  takePendingDefaultActionId: () => string | null;
  /** Read the pending-default-action id without consuming it. */
  peekPendingDefaultActionId: () => string | null;
  /** Clear shift-multi-select state at the start of context-menu open. */
  stopShiftMultiSelecting: () => void;
  /** Clear arrow-navigation state at the start of context-menu open. */
  clearArrowNavigation: () => void;
}

export interface MenuHandlers {
  /** Open the context menu at `position` anchored to `element`. */
  openContextMenu: (element: Element, position: Position) => void;
  /**
   * Consume `pendingDefaultActionId` (set by handleToggleActive) and either
   * run that action against the just-clicked element or open the regular
   * context menu if the action no longer exists.
   */
  runPendingDefaultAction: (element: Element, position: Position) => void;
  /**
   * Single dispatcher for the click-on-selected-element path: if a
   * pending-default-action is queued, run it; otherwise open the regular
   * context menu.
   */
  openContextMenuOrRunPendingDefault: (element: Element, position: Position) => void;
  /** True if a pending-default-action is queued. */
  hasPendingDefaultAction: () => boolean;
  /** Dismiss the context menu + deactivate the overlay (Esc / outside click). */
  handleContextMenuDismiss: () => void;
  /** Show the context menu for a label instance (used by the "..." button on a copied label). */
  handleShowContextMenuInstance: (instanceId: string) => void;
  /** Toolbar menu (right-click toolbar / select-hover) toggle. */
  handleToggleToolbarMenu: () => void;
  /** Update the persisted default-action id. */
  handleSetDefaultAction: (actionId: string) => void;
  /** Dismiss every secondary popup (currently just the toolbar menu). */
  dismissAllPopups: () => void;
}

/**
 * The cluster of menu-lifecycle handlers that coordinate the context menu,
 * the toolbar menu, and the default-action flow. These are coupled to each
 * other (e.g. `openContextMenu` calls `dismissAllPopups`,
 * `runPendingDefaultAction` calls `handleSetDefaultAction`+`openContextMenu`)
 * so they live in one module.
 */
export const createMenuHandlers = (input: MenuHandlersInput): MenuHandlers => {
  const {
    grab,
    pluginRegistry,
    phase,
    actionContextBuilder,
    activationLifecycle,
    toolbarMenu,
    toolbarStateController,
    resolvedComponentName,
    takePendingDefaultActionId,
    peekPendingDefaultActionId,
    stopShiftMultiSelecting,
    clearArrowNavigation,
  } = input;
  const { store, actions } = grab;
  const { isActivated } = phase;
  const { buildActionContext } = actionContextBuilder;
  const { activateRenderer, deactivateRenderer } = activationLifecycle;

  const dismissAllPopups = () => {
    toolbarMenu.dismiss();
  };

  const openContextMenu = (element: Element, position: Position) => {
    stopShiftMultiSelecting();
    actions.showContextMenu(position, element);
    clearArrowNavigation();
    dismissAllPopups();
    pluginRegistry.hooks.onContextMenu(element, position);
  };

  const handleSetDefaultAction = (actionId: string) => {
    toolbarStateController.update({ defaultAction: actionId });
  };

  const runPendingDefaultAction = (element: Element, position: Position) => {
    const actionId = takePendingDefaultActionId();
    if (!actionId) return;

    const action = pluginRegistry.store.actions.find(
      (registeredAction) => registeredAction.id === actionId,
    );
    if (!action) {
      handleSetDefaultAction(DEFAULT_ACTION_ID);
      openContextMenu(element, position);
      return;
    }

    const elementBounds = createElementBounds(element);
    const context = buildActionContext({
      element,
      filePath: store.selectionFilePath ?? undefined,
      lineNumber: store.selectionLineNumber ?? undefined,
      tagName: getTagName(element) || undefined,
      componentName: resolvedComponentName(),
      position,
      shouldDeferHideContextMenu: false,
      performWithFeedbackOptions: {
        fallbackBounds: elementBounds,
        fallbackSelectionBounds: [elementBounds],
        position,
      },
    });
    action.onAction(context);
  };

  const handleContextMenuDismiss = () => {
    setTimeout(() => {
      actions.hideContextMenu();
      deactivateRenderer();
    }, 0);
  };

  const handleToggleToolbarMenu = () => {
    if (toolbarMenu.position() !== null) {
      toolbarMenu.dismiss();
    } else {
      actions.hideContextMenu();
      toolbarMenu.open();
    }
  };

  const handleShowContextMenuInstance = (instanceId: string) => {
    const instance = store.labelInstances.find(
      (labelInstance) => labelInstance.id === instanceId,
    );
    if (!instance?.element) return;
    if (!isElementConnected(instance.element)) return;

    const contextMenuElement = instance.element;
    const center = getBoundsCenter(createElementBounds(contextMenuElement));
    const position = {
      x: instance.mouseX ?? center.x,
      y: center.y,
    };

    const elementsToFreeze =
      instance.elements && instance.elements.length > 0
        ? instance.elements.filter((element) => isElementConnected(element))
        : [contextMenuElement];

    setTimeout(() => {
      if (!isActivated()) {
        actions.setWasActivatedByToggle(true);
        activateRenderer();
      }
      actions.setPointer(position);
      actions.setFrozenElements(elementsToFreeze);
      const hasMultipleElements = elementsToFreeze.length > 1;
      if (hasMultipleElements && instance.bounds) {
        actions.setFrozenDragRect(createPageRectFromBounds(instance.bounds));
      }
      actions.freeze();
      actions.showContextMenu(position, contextMenuElement);
    }, 0);
  };

  const hasPendingDefaultAction = () => peekPendingDefaultActionId() !== null;

  const openContextMenuOrRunPendingDefault = (element: Element, position: Position) => {
    if (hasPendingDefaultAction()) {
      runPendingDefaultAction(element, position);
    } else {
      openContextMenu(element, position);
    }
  };

  return {
    openContextMenu,
    runPendingDefaultAction,
    openContextMenuOrRunPendingDefault,
    hasPendingDefaultAction,
    handleContextMenuDismiss,
    handleShowContextMenuInstance,
    handleToggleToolbarMenu,
    handleSetDefaultAction,
    dismissAllPopups,
  };
};
