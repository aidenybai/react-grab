import {
  createSignal,
  createMemo,
  createEffect,
  createResource,
  on,
} from "solid-js";
import { resolveSource } from "element-source";
import type {
  InternalPlugin,
  ActionCycleItem,
  ActionCycleState,
  ContextMenuAction,
  ContextMenuActionContext,
  BuildActionContextOptions,
  OverlayBounds,
  PerformWithFeedbackOptions,
  SelectionLabelInstance,
  AgentOptions,
} from "../../types.js";
import {
  getNearestComponentName,
  getComponentDisplayName,
} from "../context.js";
import { getTagName } from "../../utils/get-tag-name.js";
import { createElementBounds } from "../../utils/create-element-bounds.js";
import { combineBounds } from "../../utils/combine-bounds.js";
import {
  createBoundsFromDragRect,
  createFlatOverlayBounds,
} from "../../utils/create-bounds-from-drag-rect.js";
import { normalizeErrorMessage } from "../../utils/normalize-error.js";
import { logRecoverableError } from "../../utils/log-recoverable-error.js";
import { resolveActionEnabled } from "../../utils/resolve-action-enabled.js";
import { keyMatchesCode } from "../../utils/key-matches-code.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { getModifiersFromActivationKey } from "../../utils/parse-activation-key.js";
import { generateId } from "../../utils/generate-id.js";
import {
  ACTION_CYCLE_IDLE_TRIGGER_MS,
  PLUGIN_PRIORITY_MENUS,
} from "../../constants.js";
import { createLabelFadeManager } from "../../utils/label-fade-manager.js";

export const menusPlugin: InternalPlugin = {
  name: "menus",
  priority: PLUGIN_PRIORITY_MENUS,
  setup: (ctx) => {
    const { store, actions, registry, shared, derived } = ctx;
    const {
      isActivated,
      isPromptMode,
      isDragging,
      isRendererActive,
      selectionElement,
      frozenElementsBounds,
    } = derived;

    const isCommentMode = createMemo(
      () => store.pendingCommentMode || isPromptMode(),
    );

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;

      const frozenElements = store.frozenElements;
      if (frozenElements.length > 0) {
        const frozen = frozenElementsBounds();
        if (frozenElements.length === 1) {
          const firstBounds = frozen[0];
          if (firstBounds) return firstBounds;
        }
        const dragRect = store.frozenDragRect;
        if (dragRect) {
          const dragBounds = frozen[0];
          return dragBounds ?? createBoundsFromDragRect(dragRect);
        }
        return createFlatOverlayBounds(combineBounds(frozen));
      }

      const element = selectionElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    let actionCycleIdleTimeoutId: number | null = null;

    const [actionCycleItems, setActionCycleItems] = createSignal<
      ActionCycleItem[]
    >([]);
    const [actionCycleActiveIndex, setActionCycleActiveIndex] = createSignal<
      number | null
    >(null);

    const labelFade = createLabelFadeManager(actions);

    const createLabelInstanceWithBounds = (
      bounds: OverlayBounds,
      tagName: string,
      componentName: string | undefined,
      status: SelectionLabelInstance["status"],
      options?: {
        element?: Element;
        mouseX?: number;
        elements?: Element[];
        boundsMultiple?: OverlayBounds[];
        hideArrow?: boolean;
      },
    ): string => {
      actions.clearLabelInstances();
      labelFade.cancelAll();
      const instanceId = generateId("label");
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boundsHalfWidth = bounds.width / 2;
      const mouseX = options?.mouseX;
      const mouseXOffset =
        mouseX !== undefined ? mouseX - boundsCenterX : undefined;

      const instance: SelectionLabelInstance = {
        id: instanceId,
        bounds,
        boundsMultiple: options?.boundsMultiple,
        tagName,
        componentName,
        status,
        createdAt: Date.now(),
        element: options?.element,
        elements: options?.elements,
        mouseX,
        mouseXOffsetFromCenter: mouseXOffset,
        mouseXOffsetRatio:
          mouseXOffset !== undefined && boundsHalfWidth > 0
            ? mouseXOffset / boundsHalfWidth
            : undefined,
        hideArrow: options?.hideArrow,
      };
      actions.addLabelInstance(instance);
      return instanceId;
    };

    const updateLabelAfterCopy = (
      labelInstanceId: string,
      didSucceed: boolean,
      errorMessage?: string,
    ) => {
      if (didSucceed) {
        actions.updateLabelInstance(labelInstanceId, "copied");
      } else {
        actions.updateLabelInstance(
          labelInstanceId,
          "error",
          errorMessage || "Unknown error",
        );
      }
      labelFade.schedule(labelInstanceId);
    };

    const clearActionCycleIdleTimeout = () => {
      if (actionCycleIdleTimeoutId !== null) {
        window.clearTimeout(actionCycleIdleTimeoutId);
        actionCycleIdleTimeoutId = null;
      }
    };

    const resetActionCycle = () => {
      clearActionCycleIdleTimeout();
      setActionCycleItems([]);
      setActionCycleActiveIndex(null);
    };

    const canCycleActions = createMemo(() => {
      const element = selectionElement();
      return (
        Boolean(element) &&
        isRendererActive() &&
        !isPromptMode() &&
        !isDragging() &&
        store.contextMenuPosition === null
      );
    });

    const activationBaseKey = createMemo(() => {
      const { key } = getModifiersFromActivationKey(
        registry.store.options.activationKey,
      );
      return (key ?? "c").toUpperCase();
    });

    const actionCycleState = createMemo<ActionCycleState>(() => ({
      items: actionCycleItems(),
      activeIndex: actionCycleActiveIndex(),
      isVisible:
        actionCycleActiveIndex() !== null &&
        actionCycleItems().length > 0 &&
        !isCommentMode(),
    }));

    createEffect(
      on(selectionElement, () => {
        resetActionCycle();
      }),
    );

    createEffect(
      on(canCycleActions, (enabled) => {
        if (!enabled) {
          resetActionCycle();
        }
      }),
    );

    const getActionById = (actionId: string): ContextMenuAction | undefined =>
      registry.store.actions.find((action) => action.id === actionId);

    const getActionCycleContext = (): ContextMenuActionContext | undefined => {
      const element = selectionElement();
      if (!element) return undefined;

      const fallbackBounds = selectionBounds();

      return buildActionContext({
        element,
        filePath: store.selectionFilePath ?? undefined,
        lineNumber: store.selectionLineNumber ?? undefined,
        tagName: getTagName(element) || undefined,
        componentName: getComponentDisplayName(element) ?? undefined,
        position: store.pointer,
        performWithFeedbackOptions: {
          fallbackBounds,
          fallbackSelectionBounds: fallbackBounds ? [fallbackBounds] : [],
        },
        shouldDeferHideContextMenu: false,
        onBeforePrompt: resetActionCycle,
      });
    };

    const availableActionCycleItems = createMemo((): ActionCycleItem[] => {
      if (!selectionElement()) return [];

      const cycleItems: ActionCycleItem[] = [];
      for (const action of registry.store.actions) {
        const isStaticallyDisabled =
          typeof action.enabled === "boolean" && !action.enabled;
        if (isStaticallyDisabled) continue;
        const hasNonMatchingShortcut =
          action.shortcut &&
          action.shortcut.toUpperCase() !== activationBaseKey();
        if (hasNonMatchingShortcut) continue;
        cycleItems.push({
          id: action.id,
          label: action.label,
          shortcut: action.shortcut,
        });
      }
      return cycleItems;
    });

    const scheduleActionCycleActivation = () => {
      clearActionCycleIdleTimeout();
      actionCycleIdleTimeoutId = window.setTimeout(() => {
        actionCycleIdleTimeoutId = null;
        const activeIndex = actionCycleActiveIndex();
        const items = actionCycleItems();
        if (activeIndex === null || items.length === 0) return;
        const selectedItem = items[activeIndex];
        if (!selectedItem) return;
        const action = getActionById(selectedItem.id);
        if (!action) {
          resetActionCycle();
          return;
        }
        const context = getActionCycleContext();
        if (!context || !resolveActionEnabled(action, context)) {
          resetActionCycle();
          return;
        }
        resetActionCycle();
        const result = action.onAction(context);
        if (result instanceof Promise) {
          void result;
        }
      }, ACTION_CYCLE_IDLE_TRIGGER_MS);
    };

    const advanceActionCycle = (): boolean => {
      if (!canCycleActions()) return false;
      const cycleItems = availableActionCycleItems();
      if (cycleItems.length === 0) return false;

      setActionCycleItems(cycleItems);

      const currentIndex = actionCycleActiveIndex();
      const isCurrentIndexValid =
        currentIndex !== null && currentIndex < cycleItems.length;
      const nextIndex = isCurrentIndexValid
        ? (currentIndex + 1) % cycleItems.length
        : 0;

      setActionCycleActiveIndex(nextIndex);
      scheduleActionCycleActivation();
      return true;
    };

    const handleActionCycleKey = (event: KeyboardEvent): boolean => {
      if (!keyMatchesCode(activationBaseKey(), event.code)) return false;
      if (event.altKey || event.repeat) return false;
      if (isKeyboardEventTriggeredByInput(event)) return false;
      if (!advanceActionCycle()) return false;

      event.preventDefault();
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey) {
        event.stopImmediatePropagation();
      }
      return true;
    };

    const openContextMenu = (
      element: Element,
      position: { x: number; y: number },
    ) => {
      actions.showContextMenu(position, element);
      shared.clearArrowNavigation?.();
      shared.dismissAllPopups?.();
      registry.hooks.onContextMenu(element, position);
    };

    const contextMenuBounds = createMemo((): OverlayBounds | null => {
      void store.viewportVersion;
      const element = store.contextMenuElement;
      if (!element) return null;
      return createElementBounds(element);
    });

    const contextMenuPosition = createMemo(() => {
      void store.viewportVersion;
      return store.contextMenuPosition;
    });

    const contextMenuTagName = createMemo(() => {
      const element = store.contextMenuElement;
      if (!element) return undefined;
      const frozenCount = store.frozenElements.length;
      if (frozenCount > 1) {
        return `${frozenCount} elements`;
      }
      return getTagName(element) || undefined;
    });

    const [contextMenuComponentName] = createResource(
      () => ({
        element: store.contextMenuElement,
        frozenCount: store.frozenElements.length,
      }),
      async ({ element, frozenCount }) => {
        if (!element) return undefined;
        if (frozenCount > 1) return undefined;
        const name = await getNearestComponentName(element);
        return name ?? undefined;
      },
    );

    const [contextMenuFilePath] = createResource(
      () => store.contextMenuElement,
      async (element) => {
        if (!element) return null;
        return resolveSource(element);
      },
    );

    const createPerformWithFeedback = (
      element: Element,
      elements: Element[],
      tagName: string | undefined,
      componentName: string | undefined,
      options?: PerformWithFeedbackOptions,
    ) => {
      return async (action: () => Promise<boolean>): Promise<void> => {
        const fallbackBounds = options?.fallbackBounds ?? null;
        const fallbackSelectionBounds = options?.fallbackSelectionBounds ?? [];
        const position =
          options?.position ?? store.contextMenuPosition ?? store.pointer;
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

          const labelInstanceId = createLabelInstanceWithBounds(
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
          // HACK: Fire-and-forget when no label bounds to display feedback on
          try {
            await action();
          } catch (error) {
            logRecoverableError("Action failed without feedback bounds", error);
          }
        }

        if (shouldDeactivateAfter) {
          shared.deactivateRenderer?.();
        } else {
          actions.unfreeze();
        }
      };
    };

    // HACK: Defer hiding context menu until after click event propagates fully
    const deferHideContextMenu = () => {
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const buildActionContext = (
      options: BuildActionContextOptions,
    ): ContextMenuActionContext => {
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

      const elements =
        store.frozenElements.length > 0 ? store.frozenElements : [element];

      const hideContextMenuAction = shouldDeferHideContextMenu
        ? deferHideContextMenu
        : actions.hideContextMenu;

      const copyAction = () => {
        onBeforeCopy?.();
        shared.performCopyWithLabel?.({
          element,
          cursorX: position.x,
          selectedElements: elements.length > 1 ? elements : undefined,
          shouldDeactivateAfter: store.wasActivatedByToggle,
        });
        hideContextMenuAction();
      };

      const defaultEnterPromptMode = (agent?: AgentOptions) => {
        if (agent) {
          actions.setSelectedAgent(agent);
        }
        shared.clearAllLabels?.();
        onBeforePrompt?.();
        shared.preparePromptMode?.(position, element);
        actions.setPointer({ x: position.x, y: position.y });
        actions.setFrozenElement(element);
        shared.activatePromptMode?.();
        if (!isActivated()) {
          shared.activateRenderer?.();
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
          transformHtmlContent: registry.hooks.transformHtmlContent,
          onOpenFile: registry.hooks.onOpenFile,
          transformOpenFileUrl: registry.hooks.transformOpenFileUrl,
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
            shared.deactivateRenderer?.();
          } else {
            actions.unfreeze();
          }
        },
      };

      const transformedContext = registry.hooks.transformActionContext(context);
      return { ...context, ...transformedContext };
    };

    const contextMenuActionContext = createMemo(
      (): ContextMenuActionContext | undefined => {
        const element = store.contextMenuElement;
        if (!element) return undefined;
        const fileInfo = contextMenuFilePath();
        const position = store.contextMenuPosition ?? store.pointer;

        return buildActionContext({
          element,
          filePath: fileInfo?.filePath,
          lineNumber: fileInfo?.lineNumber ?? undefined,
          tagName: contextMenuTagName(),
          componentName: contextMenuComponentName(),
          position,
          shouldDeferHideContextMenu: true,
          onBeforeCopy: () => {
            // Side effect: keyboard-selected element is cleared by the
            // navigation plugin when the context menu triggers a copy.
          },
          customEnterPromptMode: (agent?: AgentOptions) => {
            if (agent) {
              actions.setSelectedAgent(agent);
            }
            shared.clearAllLabels?.();
            actions.clearInputText();
            actions.enterPromptMode(position, element);
            deferHideContextMenu();
          },
        });
      },
    );

    const handleContextMenuDismiss = () => {
      setTimeout(() => {
        actions.hideContextMenu();
        shared.deactivateRenderer?.();
      }, 0);
    };

    shared.openContextMenu = (position, element) => {
      openContextMenu(element, position);
    };
    shared.buildActionContext = buildActionContext;
    shared.createPerformWithFeedback = (
      options?: PerformWithFeedbackOptions,
    ) => {
      const element = store.contextMenuElement ?? selectionElement();
      if (!element) {
        return async () => {};
      }
      const elements =
        store.frozenElements.length > 0 ? store.frozenElements : [element];
      const tagName = getTagName(element) || undefined;
      const componentName = getComponentDisplayName(element) ?? undefined;
      return createPerformWithFeedback(
        element,
        elements,
        tagName,
        componentName,
        options,
      );
    };

    ctx.onKeyDown(handleActionCycleKey);

    ctx.provide("contextMenuPosition", () => contextMenuPosition());
    ctx.provide("contextMenuBounds", () => contextMenuBounds());
    ctx.provide("contextMenuTagName", () => contextMenuTagName());
    ctx.provide("contextMenuComponentName", () => contextMenuComponentName());
    ctx.provide("contextMenuHasFilePath", () =>
      Boolean(contextMenuFilePath()?.filePath),
    );
    ctx.provide("actions", () => registry.store.actions);
    ctx.provide("actionContext", () => contextMenuActionContext());
    ctx.provide("onContextMenuDismiss", () => handleContextMenuDismiss);
    ctx.provide("onContextMenuHide", () => deferHideContextMenu);
    ctx.provide("selectionActionCycleState", () => actionCycleState());

    return () => {
      clearActionCycleIdleTimeout();
      labelFade.cancelAll();
      shared.openContextMenu = undefined;
      shared.buildActionContext = undefined;
      shared.createPerformWithFeedback = undefined;
    };
  },
};
