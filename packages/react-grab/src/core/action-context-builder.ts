import { type Accessor } from "solid-js";
import { combineBounds } from "../utils/combine-bounds.js";
import { createFlatOverlayBounds } from "../utils/create-bounds-from-drag-rect.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { normalizeErrorMessage } from "../utils/normalize-error.js";
import type {
  ContextMenuActionContext,
  OverlayBounds,
  PerformWithFeedbackOptions,
  Position,
} from "../types.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { CopyOrchestrator } from "./copy-orchestrator.js";
import type { LabelInstanceManager } from "./label-instance-manager.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

export interface BuildActionContextOptions {
  element: Element;
  filePath: string | undefined;
  lineNumber: number | undefined;
  tagName: string | undefined;
  componentName: string | undefined;
  position: Position;
  performWithFeedbackOptions?: PerformWithFeedbackOptions;
  shouldDeferHideContextMenu: boolean;
  onBeforeCopy?: () => void;
  onBeforePrompt?: () => void;
  customEnterPromptMode?: () => void;
}

interface ActionContextBuilderInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  labelManager: LabelInstanceManager;
  copyOrchestrator: CopyOrchestrator;
  activationLifecycle: ActivationLifecycle;
  frozenElementsBounds: Accessor<OverlayBounds[]>;
  contextMenuBounds: Accessor<OverlayBounds | null>;
  isActivated: Accessor<boolean>;
  preparePromptMode: (element: Element, x: number, y: number) => void;
  activatePromptMode: () => void;
  withSelectionInteractionLock: <T>(operation: () => Promise<T>) => Promise<T>;
}

export interface ActionContextBuilder {
  /**
   * Hide the context menu on the next microtask (avoids click-through to the
   * element under the menu before the menu has finished closing).
   */
  deferHideContextMenu: () => void;
  buildActionContext: (options: BuildActionContextOptions) => ContextMenuActionContext;
}

/**
 * Builds the `ContextMenuActionContext` object passed to every plugin
 * context-menu action's `onAction` handler. The context bundles together
 * the selected element(s), source info, the `copy()` action, the
 * `enterPromptMode()` action, and the `performWithFeedback()` wrapper that
 * runs an action behind a selection-interaction lock + a copying label.
 *
 * Concentrates the wiring between {copy orchestrator, label manager,
 * activation lifecycle, prompt-mode helpers, plugin hooks} so individual
 * plugin actions get a single coherent surface.
 */
export const createActionContextBuilder = (
  input: ActionContextBuilderInput,
): ActionContextBuilder => {
  const {
    grab,
    pluginRegistry,
    labelManager,
    copyOrchestrator,
    activationLifecycle,
    frozenElementsBounds,
    contextMenuBounds,
    isActivated,
    preparePromptMode,
    activatePromptMode,
    withSelectionInteractionLock,
  } = input;
  const { store, actions, pointer } = grab;
  const { createLabelInstance, updateLabelAfterCopy, clearAllLabels } = labelManager;
  const { performCopyWithLabel } = copyOrchestrator;
  const { activateRenderer, deactivateRenderer } = activationLifecycle;

  const deferHideContextMenu = () => {
    setTimeout(() => {
      actions.hideContextMenu();
    }, 0);
  };

  const createPerformWithFeedback = (
    element: Element,
    elements: Element[],
    tagName: string | undefined,
    componentName: string | undefined,
    options?: PerformWithFeedbackOptions,
  ) => {
    return async (action: () => Promise<boolean>): Promise<void> => {
      await withSelectionInteractionLock(async () => {
        const fallbackBounds = options?.fallbackBounds ?? null;
        const fallbackSelectionBounds = options?.fallbackSelectionBounds ?? [];
        const position = options?.position ?? store.contextMenuPosition ?? pointer();
        const frozenBounds = frozenElementsBounds();
        const singleElementBounds = contextMenuBounds() ?? fallbackBounds;
        const hasMultipleElements = elements.length > 1;

        const labelBounds = hasMultipleElements
          ? createFlatOverlayBounds(combineBounds(frozenBounds))
          : singleElementBounds;

        const shouldDeactivateAfter = store.wasActivatedByToggle;
        let selectionBoundsForLabel: OverlayBounds[];
        if (hasMultipleElements) {
          selectionBoundsForLabel = frozenBounds;
        } else if (singleElementBounds) {
          selectionBoundsForLabel = [singleElementBounds];
        } else {
          selectionBoundsForLabel = fallbackSelectionBounds;
        }

        actions.hideContextMenu();

        if (labelBounds) {
          const labelCursorX = hasMultipleElements
            ? labelBounds.x + labelBounds.width / 2
            : position.x;

          const labelInstanceId = createLabelInstance(
            labelBounds,
            tagName || "element",
            componentName,
            "copying",
            {
              element,
              mouseX: labelCursorX,
              elements: hasMultipleElements ? elements : undefined,
              boundsMultiple: selectionBoundsForLabel,
            },
          );

          let didSucceed = false;
          let errorMessage: string | undefined;

          try {
            didSucceed = await action();
            if (!didSucceed) {
              errorMessage = "Failed to copy";
            }
          } catch (error) {
            errorMessage = normalizeErrorMessage(error, "Action failed");
          }

          updateLabelAfterCopy(labelInstanceId, didSucceed, errorMessage);
        } else {
          try {
            await action();
          } catch (error) {
            logRecoverableError("Action failed without feedback bounds", error);
          }
        }

        if (shouldDeactivateAfter) {
          deactivateRenderer();
        } else {
          actions.unfreeze();
        }
      });
    };
  };

  const buildActionContext = (options: BuildActionContextOptions): ContextMenuActionContext => {
    const {
      element,
      filePath,
      lineNumber,
      tagName,
      componentName,
      position,
      performWithFeedbackOptions,
      shouldDeferHideContextMenu,
      onBeforeCopy,
      onBeforePrompt,
      customEnterPromptMode,
    } = options;

    const elements = store.frozenElements.length > 0 ? store.frozenElements : [element];

    const hideContextMenuAction = shouldDeferHideContextMenu
      ? deferHideContextMenu
      : actions.hideContextMenu;

    const copyAction = () => {
      onBeforeCopy?.();
      performCopyWithLabel({
        element,
        cursorX: position.x,
        selectedElements: elements.length > 1 ? elements : undefined,
        shouldDeactivateAfter: store.wasActivatedByToggle,
      });
      hideContextMenuAction();
    };

    const defaultEnterPromptMode = () => {
      clearAllLabels();
      onBeforePrompt?.();
      preparePromptMode(element, position.x, position.y);
      actions.setPointer({ x: position.x, y: position.y });
      actions.setFrozenElement(element);
      activatePromptMode();
      if (!isActivated()) {
        activateRenderer();
      }
      hideContextMenuAction();
    };

    const context: ContextMenuActionContext = {
      element,
      elements,
      filePath,
      lineNumber,
      componentName,
      tagName,
      enterPromptMode: customEnterPromptMode ?? defaultEnterPromptMode,
      copy: copyAction,
      hooks: {
        transformHtmlContent: pluginRegistry.hooks.transformHtmlContent,
        onOpenFile: pluginRegistry.hooks.onOpenFile,
        transformOpenFileUrl: pluginRegistry.hooks.transformOpenFileUrl,
      },
      performWithFeedback: createPerformWithFeedback(
        element,
        elements,
        tagName,
        componentName,
        performWithFeedbackOptions,
      ),
      hideContextMenu: hideContextMenuAction,
      cleanup: () => {
        if (store.wasActivatedByToggle) {
          deactivateRenderer();
        } else {
          actions.unfreeze();
        }
      },
    };

    const transformedContext = pluginRegistry.hooks.transformActionContext(context);
    return { ...context, ...transformedContext };
  };

  return { deferHideContextMenu, buildActionContext };
};
