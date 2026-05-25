// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import {
  createMemo,
  createRoot,
  createSignal,
  onCleanup,
  createResource,
} from "solid-js";
import { render } from "solid-js/web";
import { createGrabStore } from "./store.js";
import { createGrabElementSelectors, createGrabPhaseSelectors } from "./selectors.js";
import { createToolbarMenuController } from "./toolbar-menu-controller.js";
import { createLabelInstanceManager } from "./label-instance-manager.js";
import { createViewportSyncObserver } from "./viewport-sync.js";
import { createArrowNavigationController } from "./arrow-navigation-controller.js";
import { createCursorOverride } from "./cursor-override.js";
import { createCopyFeedbackCooldown } from "./copy-feedback-cooldown.js";
import { createActivationHoldController } from "./activation-hold.js";
import { createDebouncedComponentName } from "./debounced-component-name.js";
import { createDragPreviewDebounce } from "./drag-preview-debounce.js";
import { createSelectionSourceSync } from "./selection-source-sync.js";
import { createOverlayEffects } from "./overlay-effects.js";
import { createEnterBlocker } from "./enter-blocker.js";
import { createRendererHost } from "./renderer-host.js";
import { createOverlayVisibility } from "./overlay-visibility.js";
import { createPluginStateBridge } from "./plugin-state-bridge.js";
import { createCopyOrchestrator } from "./copy-orchestrator.js";
import { createActivationLifecycle } from "./activation-lifecycle.js";
import { createActionContextBuilder } from "./action-context-builder.js";
import { createPromptModeHandlers } from "./prompt-mode-handlers.js";
import { createMenuHandlers } from "./menu-handlers.js";
import { createCommentModeHandlers } from "./comment-mode-handlers.js";
import { createKeydownSpamTimer } from "./keydown-spam-timer.js";
import { createSpaceDragRepositioning } from "./space-drag-repositioning.js";
import { createActivationKeyHandlers } from "./activation-key-handlers.js";
import { createDragHandlers } from "./drag-handlers.js";
import { registerKeyboardListeners } from "./keyboard-listeners.js";
import { registerPointerListeners } from "./pointer-listeners.js";
import { createInitCleanup } from "./init-cleanup.js";
import { registerLifecycleHookEffects } from "./lifecycle-hook-effects.js";
import { buildPublicApi } from "./build-public-api.js";
import { createWindowFocusListeners } from "./window-focus-listeners.js";
import { createToolbarStateController } from "./toolbar-state-controller.js";
import { createShiftMultiSelectState } from "./shift-multi-select-state.js";
import { createDragSelectors } from "./drag-selectors.js";
import { createComponentNameForElement } from "../utils/create-component-name-for-element.js";
import {
  checkIsNextProject,
  resolveSource,
} from "./context.js";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import {
} from "../utils/create-bounds-from-drag-rect.js";
import {
  DEFAULT_KEY_HOLD_DURATION_MS,
  NEXTJS_REVALIDATION_DELAY_MS,
  DEFAULT_ACTION_ID,
} from "../constants.js";
import type {
  Options,
  ReactGrabAPI,
  ContextMenuActionContext,
  ContextMenuAction,
  SettableOptions,
  SourceInfo,
  Plugin,
} from "../types.js";
import { DEFAULT_THEME } from "./theme.js";
import { createPluginRegistry } from "./plugin-registry.js";
import { createAutoScroller } from "./auto-scroll.js";
import { logIntro } from "./log-intro.js";
import { getScriptOptions } from "../utils/get-script-options.js";
import { copyPlugin } from "./plugins/copy.js";
import { commentPlugin } from "./plugins/comment.js";
import { openPlugin } from "./plugins/open.js";
import { copyContent } from "../utils/copy-content.js";
import {
  calculateDragDistance as calculateDragDistanceUtil,
  calculateDragRectangle as calculateDragRectangleUtil,
  toPageCoordinates as toPageCoordinatesUtil,
} from "../utils/drag-geometry.js";

const builtInPlugins = [copyPlugin, commentPlugin, openPlugin];

let hasInited = false;
export const init = (rawOptions?: Options): ReactGrabAPI => {
  if (typeof window === "undefined") {
    return createNoopApi();
  }

  const scriptOptions = getScriptOptions();

  const initialOptions: Options = {
    enabled: true,
    activationMode: "toggle",
    keyHoldDuration: DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: true,
    ...scriptOptions,
    ...rawOptions,
  };

  if (initialOptions.enabled === false || hasInited) {
    return createNoopApi();
  }
  hasInited = true;

  logIntro();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- need to omit enabled from settableOptions to avoid circular dependency
  const { enabled: _enabled, ...settableOptions } = initialOptions;

  return createRoot((dispose) => {
    let disposed = false;
    let disposeRenderer: (() => void) | undefined;

    const pluginRegistry = createPluginRegistry(settableOptions);

    const grab = createGrabStore({
      theme: DEFAULT_THEME,
      keyHoldDuration: pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    });
    const { store, actions, pointer } = grab;

    const phase = createGrabPhaseSelectors(grab);
    const {
      isHoldingKeys,
      isActivated,
      isFrozenPhase,
      isDragging,
      isDragRepositioning,
      didJustDrag,
      isCopying,
      didJustCopy,
      isPromptMode,
      isPendingDismiss,
    } = phase;

    const elementSelectors = createGrabElementSelectors(grab, phase);
    const {
      targetElement,
      effectiveElement,
      frozenElementsBounds,
      selectionBounds,
    } = elementSelectors;

    const labelManager = createLabelInstanceManager({
      grab,
      pluginRegistry,
      isThemeEnabled: () => pluginRegistry.store.theme.enabled,
      isGrabbedBoxesThemeEnabled: () => Boolean(pluginRegistry.store.theme.grabbedBoxes.enabled),
    });
    const {
      clearAllLabels,
      handleLabelInstanceHoverChange,
      computedLabelInstances,
      computedGrabbedBoxes,
    } = labelManager;

    const arrowNav = createArrowNavigationController({
      grab,
      phase,
      effectiveElement,
      isShiftMultiSelecting: () => isShiftMultiSelecting(),
      setKeyboardSelectedElement: (element) => {
        keyboardSelectedElement = element;
      },
    });
    const {
      state: arrowNavigationState,
      handleArrowNavigation,
      handleArrowNavigationSelect,
      clearArrowNavigation,
    } = arrowNav;

    const activationHold = createActivationHoldController(grab);
    const resetCopyConfirmation = activationHold.resetCopyConfirmation;

    const toolbarStateController = createToolbarStateController();
    const currentToolbarState = toolbarStateController.current;
    const setCurrentToolbarState = toolbarStateController.setCurrent;
    const savedToolbarState = toolbarStateController.load();
    const [isEnabled, setIsEnabled] = createSignal(
      savedToolbarState ? !savedToolbarState.collapsed : true,
    );
    const [toolbarShakeCount, setToolbarShakeCount] = createSignal(0);
    const [selectionLabelShakeCount, setSelectionLabelShakeCount] = createSignal(0);
    const [isToolbarSelectHovered, setIsToolbarSelectHovered] = createSignal(false);
    let toolbarElement: HTMLDivElement | undefined;
    const toolbarMenu = createToolbarMenuController({
      getToolbarElement: () => toolbarElement,
    });
    const toolbarMenuPosition = toolbarMenu.position;

    const shiftMultiSelect = createShiftMultiSelectState();
    const isShiftMultiSelecting = shiftMultiSelect.isActive;
    const stopShiftMultiSelecting = shiftMultiSelect.stop;



    const preparePromptMode = (element: Element, positionX: number, positionY: number) => {
      setCopyStartPosition(element, positionX, positionY);
      actions.clearInputText();
    };

    const activatePromptMode = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        actions.enterPromptMode({ x: pointer().x, y: pointer().y }, element);
      }
    };

    const setCopyStartPosition = (element: Element, positionX: number, positionY: number) => {
      actions.setCopyStart({ x: positionX, y: positionY }, element);
    };

    const dragPreviewDebounce = createDragPreviewDebounce();
    const debouncedDragPointer = dragPreviewDebounce.pointer;
    const scheduleDragPreviewUpdate = dragPreviewDebounce.schedule;
    const keydownSpamTimer = createKeydownSpamTimer();
    const copyFeedbackCooldown = createCopyFeedbackCooldown();
    let keyboardSelectedElement: Element | null = null;
    let pendingDefaultActionId: string | null = null;
    const [isPendingContextMenuSelect, setIsPendingContextMenuSelect] = createSignal(false);
    const debouncedComponentName = createDebouncedComponentName(effectiveElement);
    const resolvedComponentName = debouncedComponentName.resolved;
    const setResolvedComponentName = debouncedComponentName.setResolved;
    const spaceDragRepositioning = createSpaceDragRepositioning({
      grab,
      isDragging,
      pointer,
      toPageCoordinates: toPageCoordinatesUtil,
    });

    const autoScroller = createAutoScroller(
      pointer,
      () => isDragging(),
      (scrollDelta) => {
        if (isDragRepositioning()) {
          actions.shiftDragStart(scrollDelta);
          spaceDragRepositioning.applyScrollDelta(scrollDelta);
        }
      },
    );


    const copyOrchestrator = createCopyOrchestrator({
      grab,
      pluginRegistry,
      labelManager,
      copyFeedbackCooldown,
      deactivateRenderer: () => deactivateRenderer(),
    });


    createOverlayEffects({
      grab,
      isActivated,
      shouldFreezeReactUpdates: () => pluginRegistry.store.options.freezeReactUpdates,
    });

    const dragSelectors = createDragSelectors({
      grab,
      phase,
      elementSelectors,
      shiftMultiSelect,
      isPendingContextMenuSelect,
      debouncedDragPointer,
    });
    const {
      isDraggingBeyondThreshold,
      dragBounds,
      dragPreviewBounds,
      selectionBoundsMultiple,
      frozenLabelEntries,
      pendingShiftPreviewEntry,
      cursorPosition,
      shiftSelectionLabelMouseX,
    } = dragSelectors;

    const calculateDragDistance = (endX: number, endY: number) =>
      calculateDragDistanceUtil(store.dragStart, endX, endY);
    const calculateDragRectangle = (endX: number, endY: number) =>
      calculateDragRectangleUtil(store.dragStart, endX, endY);

    const { stop: stopSpaceDragRepositioning } = spaceDragRepositioning;

    registerLifecycleHookEffects({ grab, pluginRegistry, phase, targetElement });

    createSelectionSourceSync({
      targetElement,
      setSelectionSource: actions.setSelectionSource,
    });

    const visibility = createOverlayVisibility({
      grab,
      phase,
      elementSelectors,
      pluginRegistry,
      isToolbarSelectHovered: () => isToolbarSelectHovered(),
      isDraggingBeyondThreshold: () => isDraggingBeyondThreshold(),
      hasDragPreviewBounds: () => dragPreviewBounds().length > 0,
    });
    const {
      selectionVisible,
      selectionTagName,
      selectionLabelVisible,
      dragVisible,
      contextMenuBounds,
      contextMenuPosition,
      contextMenuTagName,
    } = visibility;

    const { publicGrabbedBoxes, publicLabelInstances } = createPluginStateBridge({
      grab,
      pluginRegistry,
      phase,
      elementSelectors,
      visibility,
      dragBounds,
      selectionBounds,
      cursorPosition,
      isDraggingBeyondThreshold,
      currentToolbarState,
    });

    const cursorOverride = createCursorOverride({ isActivated, isCopying, isPromptMode });

    const activationLifecycle = createActivationLifecycle({
      grab,
      phase,
      pluginRegistry,
      copyFeedbackCooldown,
      autoScroller,
      clearArrowNavigation,
      stopSpaceDragRepositioning: () => stopSpaceDragRepositioning(),
      stopShiftMultiSelecting: () => stopShiftMultiSelecting(),
      clearKeyboardSelectedElement: () => {
        keyboardSelectedElement = null;
      },
      clearKeydownSpamTimer: keydownSpamTimer.clear,
      clearPendingContextMenuSelect: () => setIsPendingContextMenuSelect(false),
    });
    const { deactivateRenderer, forceDeactivateAll } = activationLifecycle;

    const {
      handleInputSubmit,
      handleInputCancel,
      handleConfirmDismiss,
      handleCancelDismiss,
      handleToggleExpand,
    } = createPromptModeHandlers({
      grab,
      phase,
      targetElement,
      activationLifecycle,
      copyOrchestrator,
      preparePromptMode,
      activatePromptMode,
      setSelectionLabelShakeCount,
    });

    const actionContextBuilder = createActionContextBuilder({
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
    });
    const { buildActionContext, deferHideContextMenu } = actionContextBuilder;

    const menuHandlers = createMenuHandlers({
      grab,
      pluginRegistry,
      phase,
      actionContextBuilder,
      activationLifecycle,
      toolbarMenu,
      toolbarStateController,
      resolvedComponentName,
      takePendingDefaultActionId: () => {
        const id = pendingDefaultActionId;
        pendingDefaultActionId = null;
        return id;
      },
      peekPendingDefaultActionId: () => pendingDefaultActionId,
      stopShiftMultiSelecting: () => stopShiftMultiSelecting(),
      clearArrowNavigation,
    });
    const {
      handleContextMenuDismiss,
      handleShowContextMenuInstance,
      handleToggleToolbarMenu,
      handleSetDefaultAction,
      dismissAllPopups,
    } = menuHandlers;
    const dismissToolbarMenu = toolbarMenu.dismiss;

    const { handleToggleActive, enterCommentModeForElement, handleComment } =
      createCommentModeHandlers({
        grab,
        phase,
        activationLifecycle,
        toolbarStateController,
        isEnabled,
        setPendingDefaultActionId: (actionId) => {
          pendingDefaultActionId = actionId;
        },
        setPendingContextMenuSelect: setIsPendingContextMenuSelect,
      });

    const dragHandlers = createDragHandlers({
      grab,
      pluginRegistry,
      phase,
      elementSelectors,
      autoScroller,
      shiftMultiSelect,
      spaceDragRepositioning,
      copyOrchestrator,
      menuHandlers,
      commentModeHandlers: { handleToggleActive, enterCommentModeForElement, handleComment },
      dragPreviewDebounce,
      pointer,
      isEnabled,
      isPendingContextMenuSelect,
      setIsPendingContextMenuSelect,
      isDragRepositioning,
      takeKeyboardSelectedElement: () => {
        const element = keyboardSelectedElement;
        keyboardSelectedElement = null;
        return element;
      },
      scheduleDragPreviewUpdate,
      setResolvedComponentName,
      clearArrowNavigation,
      toPageCoordinates: toPageCoordinatesUtil,
      calculateDragDistance,
      calculateDragRectangle,
    });
    const { cancelActiveDrag } = dragHandlers;

    const eventListenerManager = createEventListenerManager();

    const enterBlocker = createEnterBlocker({
      grab,
      isActivated,
      isHoldingKeys,
      isPromptMode,
      eventListenerManager,
    });

    const {
      handleEnterKeyActivation,
      handleOpenFileShortcut,
      handleContextMenuKey,
      handleActivationKeys,
    } = createActivationKeyHandlers({
      grab,
      pluginRegistry,
      phase,
      elementSelectors,
      activationHold,
      activationLifecycle,
      menuHandlers,
      keydownSpamTimer,
      pointer,
      didJustCopy,
      resetCopyConfirmation,
      preparePromptMode,
      activatePromptMode,
    });

    const windowFocusListeners = createWindowFocusListeners({
      grab,
      phase,
      activationLifecycle,
      activationHold,
      eventListenerManager,
      cancelActiveDrag: () => cancelActiveDrag(),
      stopShiftMultiSelecting: () => stopShiftMultiSelecting(),
    });

    registerKeyboardListeners({
      grab,
      pluginRegistry,
      phase,
      activationHold,
      activationKeyHandlers: {
        handleEnterKeyActivation,
        handleOpenFileShortcut,
        handleContextMenuKey,
        handleActivationKeys,
      },
      activationLifecycle,
      arrowNavigation: {
        state: arrowNavigationState,
        handleArrowNavigation,
        handleArrowNavigationSelect,
        clearArrowNavigation,
      },
      copyFeedbackCooldown,
      dragHandlers,
      enterBlocker,
      eventListenerManager,
      keydownSpamTimer,
      shiftMultiSelect,
      spaceDragRepositioning,
      toolbarMenu,
      windowFocusListeners,
      isEnabled,
      isDragRepositioning,
      didJustCopy,
      setToolbarShakeCount,
      resetCopyConfirmation,
      handleInputCancel,
    });

    registerPointerListeners({
      grab,
      phase,
      elementSelectors,
      activationHold,
      activationLifecycle,
      arrowNavigation: {
        state: arrowNavigationState,
        handleArrowNavigation,
        handleArrowNavigationSelect,
        clearArrowNavigation,
      },
      dragHandlers,
      enterBlocker,
      eventListenerManager,
      menuHandlers,
      promptModeHandlers: {
        handleInputSubmit,
        handleInputCancel,
        handleConfirmDismiss,
        handleCancelDismiss,
        handleToggleExpand,
      },
      shiftMultiSelect,
      toolbarMenu,
      selectionBounds,
      didJustDrag,
    });

    createViewportSyncObserver({
      grab,
      phase,
      isEnabled,
      isThemeEnabled: () => pluginRegistry.store.theme.enabled,
      eventListenerManager,
    });


    onCleanup(
      createInitCleanup({
        eventListenerManager,
        dragPreviewDebounce,
        keydownSpamTimer,
        copyFeedbackCooldown,
        toolbarMenu,
        labelManager,
        cursorOverride,
        enterBlocker,
        autoScroller,
      }),
    );

    const resolvedCssText = typeof cssText === "string" ? cssText : "";
    const { root: rendererRoot } = createRendererHost({
      cssText: resolvedCssText,
      themeHue: () => pluginRegistry.store.theme.hue,
    });


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
        element,
        filePath: fileInfo?.filePath,
        lineNumber: fileInfo?.lineNumber ?? undefined,
        tagName: contextMenuTagName(),
        componentName: contextMenuComponentName(),
        position,
        shouldDeferHideContextMenu: true,
        onBeforeCopy: () => {
          keyboardSelectedElement = null;
        },
        customEnterPromptMode: () => {
          clearAllLabels();
          actions.clearInputText();
          actions.enterPromptMode(position, element);
          deferHideContextMenu();
        },
      });
    });

    if (pluginRegistry.store.theme.enabled) {
      // The renderer is dynamically imported because solid-js/web's
      // solid-js/web's delegateEvents() runs at module evaluation time and
      // accesses document, which would crash during SSR.
      void import("../components/renderer.js")
        .then(({ ReactGrabRenderer }) => {
          if (disposed) return;
          disposeRenderer = render(() => {
            return (
              <ReactGrabRenderer
                selectionVisible={selectionVisible()}
                selectionBounds={selectionBounds()}
                selectionBoundsMultiple={selectionBoundsMultiple()}
                selectionShouldSnap={
                  store.frozenElements.length > 0 || dragPreviewBounds().length > 0
                }
                selectionElementsCount={store.frozenElements.length}
                frozenLabelEntries={frozenLabelEntries()}
                pendingShiftPreviewEntry={pendingShiftPreviewEntry() ?? undefined}
                selectionFilePath={store.selectionFilePath ?? undefined}
                selectionLineNumber={store.selectionLineNumber ?? undefined}
                selectionTagName={selectionTagName()}
                selectionComponentName={resolvedComponentName()}
                selectionLabelVisible={selectionLabelVisible()}
                selectionLabelStatus="idle"
                selectionArrowNavigationState={arrowNavigationState()}
                onArrowNavigationSelect={handleArrowNavigationSelect}
                labelInstances={computedLabelInstances()}
                dragVisible={dragVisible()}
                dragBounds={dragBounds()}
                grabbedBoxes={computedGrabbedBoxes()}
                mouseX={
                  store.frozenElements.length > 1
                    ? undefined
                    : (shiftSelectionLabelMouseX() ?? cursorPosition().x)
                }
                isFrozen={isFrozenPhase() || isActivated() || isToolbarSelectHovered()}
                inputValue={store.inputText}
                isPromptMode={isPromptMode()}
                onShowContextMenuInstance={handleShowContextMenuInstance}
                onLabelInstanceHoverChange={handleLabelInstanceHoverChange}
                onInputChange={actions.setInputText}
                onInputSubmit={() => void handleInputSubmit()}
                onToggleExpand={handleToggleExpand}
                isPendingDismiss={isPendingDismiss()}
                selectionLabelShakeCount={selectionLabelShakeCount()}
                onConfirmDismiss={handleConfirmDismiss}
                onCancelDismiss={handleCancelDismiss}
                toolbarVisible={pluginRegistry.store.theme.toolbar.enabled}
                isActive={isActivated()}
                onToggleActive={handleToggleActive}
                enabled={isEnabled()}
                shakeCount={toolbarShakeCount()}
                onToolbarStateChange={(state) => {
                  setCurrentToolbarState(state);
                  if (state.enabled !== isEnabled()) {
                    setIsEnabled(state.enabled);
                    if (!state.enabled) {
                      forceDeactivateAll();
                      dismissAllPopups();
                    }
                  }
                  toolbarStateController.notify(state);
                }}
                onSubscribeToToolbarStateChanges={toolbarStateController.onChange}
                onToolbarSelectHoverChange={setIsToolbarSelectHovered}
                onToolbarRef={(element) => {
                  toolbarElement = element;
                }}
                contextMenuPosition={contextMenuPosition()}
                contextMenuBounds={contextMenuBounds()}
                contextMenuTagName={contextMenuTagName()}
                contextMenuComponentName={contextMenuComponentName()}
                contextMenuHasFilePath={Boolean(contextMenuFilePath()?.filePath)}
                actions={pluginRegistry.store.actions}
                actionContext={contextMenuActionContext()}
                onContextMenuDismiss={handleContextMenuDismiss}
                onContextMenuHide={deferHideContextMenu}
                toolbarMenuPosition={toolbarMenuPosition()}
                toolbarMenuActions={pluginRegistry.store.actions.filter(
                  (action) => action.showInToolbarMenu === true,
                )}
                defaultActionId={currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID}
                onSetDefaultAction={handleSetDefaultAction}
                onToggleToolbarMenu={handleToggleToolbarMenu}
                onToolbarMenuDismiss={dismissToolbarMenu}
              />
            );
          }, rendererRoot);
        })
        .catch((error) => {
          console.warn("[react-grab] Failed to load renderer:", error);
        });
    }

    const api: ReactGrabAPI = buildPublicApi({
      grab,
      pluginRegistry,
      phase,
      elementSelectors,
      dragSelectors,
      visibility,
      pluginStateBridge: { publicGrabbedBoxes, publicLabelInstances },
      activationLifecycle,
      commentModeHandlers: { handleToggleActive, enterCommentModeForElement, handleComment },
      copyOrchestrator,
      toolbarMenu,
      toolbarStateController,
      menuHandlers,
      isEnabled,
      setIsEnabled,
      setDisposed: () => {
        disposed = true;
      },
      getDisposeRenderer: () => disposeRenderer,
      resetHasInited: () => {
        hasInited = false;
      },
      rootDispose: dispose,
      getApi: () => api,
    });

    for (const plugin of builtInPlugins) {
      pluginRegistry.register(plugin, api);
    }

    setTimeout(() => {
      checkIsNextProject(true);
    }, NEXTJS_REVALIDATION_DELAY_MS);

    return api;
  });
};

export { getStack, getElementContext as formatElementInfo } from "./context.js";
export { isInstrumentationActive } from "bippy";
export { DEFAULT_THEME } from "./theme.js";

export type {
  Options,
  OverlayBounds,
  ReactGrabRendererProps,
  ReactGrabAPI,
  SourceInfo,
  AgentContext,
  SettableOptions,
  ContextMenuAction,
  ActionContext,
  Plugin,
  PluginConfig,
  PluginHooks,
} from "../types.js";

export { generateSnippet } from "../utils/generate-snippet.js";
export { copyContent } from "../utils/copy-content.js";
