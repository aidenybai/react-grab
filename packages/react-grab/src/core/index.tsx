// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import {
  createRoot,
  createSignal,
  onCleanup,
} from "solid-js";
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
import { mountRenderer } from "./mount-renderer.js";
import { createContextMenuActionContext } from "./context-menu-action-context.js";
import { createPromptModePreset } from "./prompt-mode-preset.js";
import { createCoordinationFlags } from "./coordination-flags.js";
import { buildPublicApi } from "./build-public-api.js";
import { createWindowFocusListeners } from "./window-focus-listeners.js";
import { createToolbarStateController } from "./toolbar-state-controller.js";
import { createShiftMultiSelectState } from "./shift-multi-select-state.js";
import { createDragSelectors } from "./drag-selectors.js";
import {
  checkIsNextProject,
} from "./context.js";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import {
  DEFAULT_KEY_HOLD_DURATION_MS,
  NEXTJS_REVALIDATION_DELAY_MS,
} from "../constants.js";
import type {
  Options,
  ReactGrabAPI,
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
    const coordinationFlags = createCoordinationFlags();

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
      handleLabelInstanceHoverChange,
      computedLabelInstances,
      computedGrabbedBoxes,
    } = labelManager;

    const arrowNav = createArrowNavigationController({
      grab,
      phase,
      effectiveElement,
      isShiftMultiSelecting: () => isShiftMultiSelecting(),
      setKeyboardSelectedElement: coordinationFlags.setKeyboardSelectedElement,
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



    const { preparePromptMode, activatePromptMode } = createPromptModePreset({
      grab,
      pointer,
      targetElement,
    });

    const dragPreviewDebounce = createDragPreviewDebounce();
    const debouncedDragPointer = dragPreviewDebounce.pointer;
    const scheduleDragPreviewUpdate = dragPreviewDebounce.schedule;
    const keydownSpamTimer = createKeydownSpamTimer();
    const copyFeedbackCooldown = createCopyFeedbackCooldown();
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
      clearKeyboardSelectedElement: () => coordinationFlags.setKeyboardSelectedElement(null),
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
    const { deferHideContextMenu } = actionContextBuilder;

    const menuHandlers = createMenuHandlers({
      grab,
      pluginRegistry,
      phase,
      actionContextBuilder,
      activationLifecycle,
      toolbarMenu,
      toolbarStateController,
      resolvedComponentName,
      takePendingDefaultActionId: coordinationFlags.takePendingDefaultActionId,
      peekPendingDefaultActionId: coordinationFlags.peekPendingDefaultActionId,
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
        setPendingDefaultActionId: coordinationFlags.setPendingDefaultActionId,
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
      takeKeyboardSelectedElement: coordinationFlags.takeKeyboardSelectedElement,
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


    const {
      contextMenuComponentName,
      contextMenuFilePath,
      contextMenuActionContext,
    } = createContextMenuActionContext({
      grab,
      actionContextBuilder,
      labelManager,
      pointer,
      contextMenuTagName,
      clearKeyboardSelectedElement: () => coordinationFlags.setKeyboardSelectedElement(null),
    });

    mountRenderer({
      grab,
      pluginRegistry,
      rendererRoot,
      isDisposed: () => disposed,
      setDisposeRenderer: (dispose) => {
        disposeRenderer = dispose;
      },
      selectionVisible,
      selectionBounds,
      selectionBoundsMultiple,
      dragPreviewBounds,
      frozenLabelEntries,
      pendingShiftPreviewEntry,
      selectionTagName,
      resolvedComponentName,
      selectionLabelVisible,
      arrowNavigationState,
      computedLabelInstances,
      dragVisible,
      dragBounds,
      computedGrabbedBoxes,
      shiftSelectionLabelMouseX,
      cursorPosition,
      isFrozenPhase,
      isActivated,
      isToolbarSelectHovered,
      isPromptMode,
      isPendingDismiss,
      isEnabled,
      selectionLabelShakeCount,
      toolbarShakeCount,
      contextMenuPosition,
      contextMenuBounds,
      contextMenuTagName,
      contextMenuComponentName,
      contextMenuHasFilePath: () => Boolean(contextMenuFilePath()?.filePath),
      contextMenuActionContext,
      toolbarMenuPosition,
      currentToolbarState,
      themeToolbarEnabled: () => pluginRegistry.store.theme.toolbar.enabled,
      storeActions: () => pluginRegistry.store.actions,
      handleArrowNavigationSelect,
      handleShowContextMenuInstance,
      handleLabelInstanceHoverChange,
      handleInputSubmit,
      handleToggleExpand,
      handleConfirmDismiss,
      handleCancelDismiss,
      handleToggleActive,
      handleContextMenuDismiss,
      deferHideContextMenu,
      handleSetDefaultAction,
      handleToggleToolbarMenu,
      dismissToolbarMenu,
      setCurrentToolbarState,
      setIsEnabled,
      forceDeactivateAll,
      dismissAllPopups,
      toolbarStateNotify: toolbarStateController.notify,
      toolbarStateOnChange: toolbarStateController.onChange,
      setIsToolbarSelectHovered,
      setToolbarElement: (element) => {
        toolbarElement = element;
      },
    });

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
