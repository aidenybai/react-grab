// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import {
  createMemo,
  createRoot,
  createSignal,
  onCleanup,
  createEffect,
  createResource,
  on,
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
import { buildPublicApi } from "./build-public-api.js";
import { createWindowFocusListeners } from "./window-focus-listeners.js";
import { createToolbarStateController } from "./toolbar-state-controller.js";
import { createShiftMultiSelectState } from "./shift-multi-select-state.js";
import { createDragSelectors } from "./drag-selectors.js";
import {
  isKeyboardEventTriggeredByInput,
} from "../utils/is-keyboard-event-triggered-by-input.js";
import { createComponentNameForElement } from "../utils/create-component-name-for-element.js";
import {
  getComponentDisplayName,
  checkIsNextProject,
  resolveSource,
} from "./context.js";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import {
  clearElementPositionCache,
  getElementAtPosition,
  getElementsAtPoint,
} from "../utils/get-element-at-position.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { getElementAnchorRatio } from "../utils/get-element-anchor-ratio.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import {
  createPageRectFromBounds,
} from "../utils/create-bounds-from-drag-rect.js";
import { getTagName } from "../utils/get-tag-name.js";
import {
  ARROW_KEYS,
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  PENDING_DETECTION_STALENESS_MS,
  MODIFIER_KEYS,
  DEFAULT_KEY_HOLD_DURATION_MS,
  MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS,
  NEXTJS_REVALIDATION_DELAY_MS,
  DEFAULT_ACTION_ID,
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { parseActivationKey } from "../utils/parse-activation-key.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import type {
  Position,
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
import { getRequiredModifiers } from "./keyboard-handlers.js";
import { createAutoScroller, getAutoScrollDirection } from "./auto-scroll.js";
import { logIntro } from "./log-intro.js";
import { getScriptOptions } from "../utils/get-script-options.js";
import { isEnterCode } from "../utils/is-enter-code.js";
import { isMac } from "../utils/is-mac.js";
import { isPositionInsideBounds } from "../utils/is-position-inside-bounds.js";
import { copyPlugin } from "./plugins/copy.js";
import { commentPlugin } from "./plugins/comment.js";
import { openPlugin } from "./plugins/open.js";
import { freezeAllAnimations } from "../utils/freeze-animations.js";
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
      isSelectionInteractionLocked,
      didJustCopy,
      isPromptMode,
      isPendingDismiss,
    } = phase;

    const elementSelectors = createGrabElementSelectors(grab, phase);
    const {
      isRendererActive,
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
    const clearHoldTimer = activationHold.clearTimer;
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
    const setIsShiftMultiSelecting = shiftMultiSelect.setActive;
    const stopShiftMultiSelecting = shiftMultiSelect.stop;


    createEffect(
      on(isHoldingKeys, (currentlyHolding, previouslyHolding = false) => {
        if (!previouslyHolding || currentlyHolding || !isActivated()) {
          return;
        }
        if (pluginRegistry.store.options.activationMode !== "hold") {
          actions.setWasActivatedByToggle(true);
        }
        pluginRegistry.hooks.onActivate();
      }),
    );

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

    const elementDetectionState = {
      lastDetectionTimestamp: 0,
      pendingDetectionScheduledAt: 0,
      latestPointerX: 0,
      latestPointerY: 0,
    };
    const dragPreviewDebounce = createDragPreviewDebounce();
    const debouncedDragPointer = dragPreviewDebounce.pointer;
    const scheduleDragPreviewUpdate = dragPreviewDebounce.schedule;
    const keydownSpamTimer = createKeydownSpamTimer();
    const copyFeedbackCooldown = createCopyFeedbackCooldown();
    const clearCopyFeedbackCooldown = copyFeedbackCooldown.clear;
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
    const {
      performCopyWithLabel,
      performCopyWithPerElementLabels,
    } = copyOrchestrator;

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

    const toPageCoordinates = toPageCoordinatesUtil;
    const calculateDragDistance = (endX: number, endY: number) =>
      calculateDragDistanceUtil(store.dragStart, endX, endY);
    const calculateDragRectangle = (endX: number, endY: number) =>
      calculateDragRectangleUtil(store.dragStart, endX, endY);

    const {
      isActivationKey: isSpaceActivationKey,
      start: startSpaceDragRepositioning,
      stop: stopSpaceDragRepositioning,
    } = spaceDragRepositioning;

    createEffect(
      on(
        () => [targetElement(), store.lastGrabbedElement] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            actions.setLastGrabbed(null);
          }
          if (currentElement) {
            pluginRegistry.hooks.onElementHover(currentElement);
          }
        },
      ),
    );

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
      openContextMenu,
      openContextMenuOrRunPendingDefault,
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

    const handlePointerMove = (clientX: number, clientY: number, isShiftHeld: boolean) => {
      const shouldTrackPendingShiftSelection =
        isShiftHeld &&
        isShiftMultiSelecting() &&
        !isDragging() &&
        !store.pendingCommentMode &&
        !isPendingContextMenuSelect();

      if (
        !isEnabled() ||
        isPromptMode() ||
        (isFrozenPhase() && !shouldTrackPendingShiftSelection) ||
        isSelectionInteractionLocked() ||
        store.contextMenuPosition !== null
      ) {
        return;
      }

      actions.setPointer({ x: clientX, y: clientY });

      elementDetectionState.latestPointerX = clientX;
      elementDetectionState.latestPointerY = clientY;

      if (shouldTrackPendingShiftSelection) {
        const candidate = getElementAtPosition(clientX, clientY);
        if (candidate !== store.detectedElement) {
          actions.setDetectedElement(candidate);
        }
        return;
      }

      const now = performance.now();
      const isDetectionPending =
        elementDetectionState.pendingDetectionScheduledAt > 0 &&
        now - elementDetectionState.pendingDetectionScheduledAt < PENDING_DETECTION_STALENESS_MS;
      if (
        now - elementDetectionState.lastDetectionTimestamp >= ELEMENT_DETECTION_THROTTLE_MS &&
        !isDetectionPending
      ) {
        elementDetectionState.lastDetectionTimestamp = now;
        elementDetectionState.pendingDetectionScheduledAt = now;
        setTimeout(() => {
          const candidate = getElementAtPosition(
            elementDetectionState.latestPointerX,
            elementDetectionState.latestPointerY,
          );
          if (candidate !== store.detectedElement) {
            actions.setDetectedElement(candidate);
          }
          elementDetectionState.pendingDetectionScheduledAt = 0;
        });
      }

      if (isDragging()) {
        if (isDragRepositioning()) {
          const { pageX, pageY } = toPageCoordinates(clientX, clientY);
          const delta = spaceDragRepositioning.applyPointerDelta(pageX, pageY);
          if (delta) actions.shiftDragStart(delta);
        }

        scheduleDragPreviewUpdate(clientX, clientY);

        const direction = getAutoScrollDirection(clientX, clientY);
        const isNearEdge = direction.top || direction.bottom || direction.left || direction.right;

        if (isNearEdge && !autoScroller.isActive()) {
          autoScroller.start();
        } else if (!isNearEdge && autoScroller.isActive()) {
          autoScroller.stop();
        }
      }
    };

    const handlePointerDown = (clientX: number, clientY: number, isShiftHeld: boolean) => {
      if (!isRendererActive() || isSelectionInteractionLocked()) return false;

      if (!isShiftHeld && isShiftMultiSelecting()) {
        stopShiftMultiSelecting();
      }

      actions.startDrag({ x: clientX, y: clientY }, isShiftHeld);
      actions.setPointer({ x: clientX, y: clientY });
      document.body.style.userSelect = "none";

      scheduleDragPreviewUpdate(clientX, clientY);

      pluginRegistry.hooks.onDragStart(clientX + window.scrollX, clientY + window.scrollY);

      return true;
    };

    const toggleShiftMultiSelection = (element: Element, pointer: Position) => {
      const wasElementSelected = store.frozenElements.includes(element);
      const isFirstFrozenElement = store.frozenElements.length === 0;

      if (!wasElementSelected) {
        const bounds = createElementBounds(element);
        const anchorRatio = getElementAnchorRatio(bounds, pointer);
        shiftMultiSelect.setAnchorRatio(element, anchorRatio);
        if (isFirstFrozenElement) {
          const componentName = getComponentDisplayName(element) ?? undefined;
          setResolvedComponentName(componentName);
        }
      }

      actions.toggleFrozenElement(element);
      clearElementPositionCache();
      const isElementStillSelected = store.frozenElements.includes(element);

      if (!isElementStillSelected) {
        shiftMultiSelect.deleteAnchor(element);
      }

      if (store.frozenElements.length === 0) {
        stopShiftMultiSelecting();
        actions.unfreeze();
        return;
      }

      // Animation freeze must run on the combined accumulated set, not just
      // on the toggled element. freezeAllAnimations unfreezes its previous
      // input before freezing its new input, so passing only [element] would
      // resume animations on every previously shift-clicked element.
      freezeAllAnimations(store.frozenElements);
      setIsShiftMultiSelecting(true);
      actions.setPointer(pointer);
      // After toggleFrozenElement, the most recently changed element is
      // either added (still in frozenElements) or removed. Anchor
      // lastGrabbed to a still-selected element rather than to one that
      // was just deselected.
      actions.setLastGrabbed(
        isElementStillSelected ? element : store.frozenElements[store.frozenElements.length - 1],
      );
      actions.freeze();
      clearArrowNavigation();
    };

    const commitShiftMultiSelection = () => {
      const accumulatedElements = store.frozenElements.filter(isElementConnected);

      const perElementLabelEntries = accumulatedElements.map((element) => {
        const tagName = getTagName(element) || "element";
        const componentName = getComponentDisplayName(element) ?? undefined;
        const anchorRatio = shiftMultiSelect.getAnchorRatio(element);
        const bounds = createElementBounds(element);
        const mouseX =
          anchorRatio === undefined
            ? bounds.x + bounds.width / 2
            : bounds.x + bounds.width * anchorRatio;
        return { element, tagName, componentName, mouseX };
      });

      stopShiftMultiSelecting();

      if (accumulatedElements.length === 0) {
        actions.unfreeze();
        return;
      }

      if (accumulatedElements.length === 1) {
        performCopyWithLabel({
          element: accumulatedElements[0],
          cursorX: perElementLabelEntries[0].mouseX,
          selectedElements: accumulatedElements,
          shouldDeactivateAfter: store.wasActivatedByToggle,
        });
        return;
      }

      performCopyWithPerElementLabels({
        elements: accumulatedElements,
        labelEntries: perElementLabelEntries,
        shouldDeactivateAfter: store.wasActivatedByToggle,
      });
    };

    const handleDragSelection = (
      dragSelectionRect: ReturnType<typeof calculateDragRectangle>,
      hasModifierKeyHeld: boolean,
      isShiftHeld: boolean,
    ) => {
      const elements = getElementsInDrag(dragSelectionRect, isValidGrabbableElement);
      const selectedElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(dragSelectionRect, isValidGrabbableElement, false);

      if (selectedElements.length === 0) return;

      const isShiftAccumulating =
        isShiftHeld && !store.pendingCommentMode && !isPendingContextMenuSelect();

      // In the shift-accumulating branch we must freeze on the COMBINED set
      // (prior accumulated + newly dragged), because freezeAllAnimations
      // unfreezes its prior input via finishAnimations() — which permanently
      // advances WAAPI animations on previously selected elements past the
      // freeze point. Calling it once with [...prior, ...new] keeps prior
      // animations paused.
      if (isShiftAccumulating) {
        actions.addFrozenElements(selectedElements);
      }
      freezeAllAnimations(isShiftAccumulating ? store.frozenElements : selectedElements);

      pluginRegistry.hooks.onDragEnd(selectedElements, dragSelectionRect);

      if (isShiftAccumulating) {
        const lastElement = selectedElements[selectedElements.length - 1];
        setIsShiftMultiSelecting(true);
        clearElementPositionCache();
        actions.setPointer(getBoundsCenter(createElementBounds(lastElement)));
        actions.setLastGrabbed(lastElement);
        actions.freeze();
        clearArrowNavigation();
        return;
      }

      const firstElement = selectedElements[0];
      const center = getBoundsCenter(createElementBounds(firstElement));

      actions.setPointer(center);
      actions.setFrozenElements(selectedElements);
      const dragRect = createPageRectFromBounds(dragSelectionRect);
      actions.setFrozenDragRect(dragRect);
      actions.freeze();
      actions.setLastGrabbed(firstElement);

      if (store.pendingCommentMode) {
        enterCommentModeForElement(firstElement, center.x, center.y);
        return;
      }

      if (isPendingContextMenuSelect()) {
        setIsPendingContextMenuSelect(false);
        openContextMenuOrRunPendingDefault(firstElement, center);
        return;
      }

      const shouldDeactivateAfter = store.wasActivatedByToggle && !hasModifierKeyHeld;

      performCopyWithLabel({
        element: firstElement,
        cursorX: center.x,
        selectedElements,
        shouldDeactivateAfter,
        dragRect,
      });
    };

    const getFrozenElementAtPosition = (position: Position): Element | null => {
      for (const element of store.frozenElements) {
        if (!isElementConnected(element)) continue;
        if (isPositionInsideBounds(position, createElementBounds(element))) {
          return element;
        }
      }
      return null;
    };

    const handleSingleClick = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
      isShiftHeld: boolean,
    ) => {
      const validFrozenElement = isElementConnected(store.frozenElement)
        ? store.frozenElement
        : null;

      const validKeyboardSelectedElement = isElementConnected(keyboardSelectedElement)
        ? keyboardSelectedElement
        : null;

      const elementAtPointer =
        getElementsAtPoint(clientX, clientY).find(isValidGrabbableElement) ?? null;
      const selectedElementUnderPointer =
        elementAtPointer ??
        (isElementConnected(store.detectedElement) ? store.detectedElement : null);
      const selectedElement =
        selectedElementUnderPointer ?? validFrozenElement ?? validKeyboardSelectedElement;
      if (!selectedElement) return;

      // While Shift is held we only operate on the live elementAtPointer.
      // Falling through to the non-shift path would let the
      // selectedElement fallback chain resolve to the previously-frozen
      // element and fire an unintended single-element copy that races
      // with the eventual commitShiftMultiSelection on Shift release. So
      // we always return when Shift is held: toggle when an element is
      // under the pointer, no-op when it isn't.
      if (isShiftHeld && !store.pendingCommentMode && !isPendingContextMenuSelect()) {
        if (elementAtPointer !== null) {
          toggleShiftMultiSelection(elementAtPointer, { x: clientX, y: clientY });
        }
        return;
      }

      let positionX: number;
      let positionY: number;

      const didResolveFromFrozenElement =
        selectedElementUnderPointer === null && validFrozenElement === selectedElement;
      const didResolveFromKeyboardElement =
        selectedElementUnderPointer === null &&
        validFrozenElement === null &&
        validKeyboardSelectedElement === selectedElement;

      if (didResolveFromFrozenElement) {
        positionX = pointer().x;
        positionY = pointer().y;
      } else if (didResolveFromKeyboardElement) {
        const elementCenter = getBoundsCenter(createElementBounds(selectedElement));
        positionX = elementCenter.x;
        positionY = elementCenter.y;
      } else {
        positionX = clientX;
        positionY = clientY;
      }

      keyboardSelectedElement = null;

      if (store.pendingCommentMode) {
        enterCommentModeForElement(selectedElement, positionX, positionY);
        return;
      }

      if (isPendingContextMenuSelect()) {
        setIsPendingContextMenuSelect(false);
        const { wasIntercepted } = pluginRegistry.hooks.onElementSelect(selectedElement);
        if (wasIntercepted) return;

        freezeAllAnimations([selectedElement]);
        actions.setFrozenElement(selectedElement);
        const position = { x: positionX, y: positionY };
        actions.setPointer(position);
        actions.freeze();
        openContextMenuOrRunPendingDefault(selectedElement, position);
        return;
      }

      const shouldDeactivateAfter = store.wasActivatedByToggle && !hasModifierKeyHeld;

      actions.setLastGrabbed(selectedElement);

      performCopyWithLabel({
        element: selectedElement,
        cursorX: positionX,
        shouldDeactivateAfter,
      });
    };

    const cancelActiveDrag = () => {
      if (!isDragging()) return;
      stopSpaceDragRepositioning();
      actions.cancelDrag();
      autoScroller.stop();
      document.body.style.userSelect = "";
    };

    const handlePointerUp = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
      isShiftHeld: boolean,
    ) => {
      if (!isDragging()) return;

      dragPreviewDebounce.cancel();

      const dragDistance = calculateDragDistance(clientX, clientY);
      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX;

      // The rectangle needs to be calculated before endDrag() because endDrag
      // resets dragStart in the store, which would zero out the rectangle.
      const dragSelectionRect = wasDragGesture ? calculateDragRectangle(clientX, clientY) : null;

      if (wasDragGesture) {
        actions.endDrag();
      } else {
        actions.cancelDrag();
      }
      stopSpaceDragRepositioning();
      autoScroller.stop();
      document.body.style.userSelect = "";

      if (dragSelectionRect) {
        handleDragSelection(dragSelectionRect, hasModifierKeyHeld, isShiftHeld);
      } else {
        handleSingleClick(clientX, clientY, hasModifierKeyHeld, isShiftHeld);
      }
    };

    const eventListenerManager = createEventListenerManager();

    const enterBlocker = createEnterBlocker({
      grab,
      isActivated,
      isHoldingKeys,
      isPromptMode,
      eventListenerManager,
    });
    const blockEnterIfNeeded = enterBlocker.blockEnterIfNeeded;

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

    eventListenerManager.addWindowListener(
      "keydown",
      (event: KeyboardEvent) => {
        blockEnterIfNeeded(event);

        if (!isEnabled()) {
          if (isTargetKeyCombination(event, pluginRegistry.store.options) && !event.repeat) {
            setToolbarShakeCount((count) => count + 1);
          }
          return;
        }

        const isEnterToActivateInput =
          isEnterCode(event.code) && isHoldingKeys() && !isPromptMode();

        const isFromReactGrabInput = isEventFromOverlay(event, "data-react-grab-input");
        if (
          isPromptMode() &&
          isTargetKeyCombination(event, pluginRegistry.store.options) &&
          !event.repeat &&
          !isFromReactGrabInput
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleInputCancel();
          return;
        }

        if (event.key === "Escape" && toolbarMenuPosition() !== null) {
          dismissToolbarMenu();
          return;
        }

        // When the context menu is open, its own registerOverlayDismiss
        // listener handles Escape. Bail out so the global handler doesn't
        // fire deactivateRenderer first via the isFromOverlay branch
        // (the menu container now holds focus, so composedPath() includes
        // data-react-grab-ignore-events).
        if (event.key === "Escape" && store.contextMenuPosition !== null) {
          return;
        }

        const isFromOverlay =
          isEventFromOverlay(event, "data-react-grab-ignore-events") && !isEnterToActivateInput;

        if (isPromptMode() || isFromOverlay) {
          if (event.key === "Escape") {
            if (isPromptMode()) {
              handleInputCancel();
            } else if (store.wasActivatedByToggle) {
              deactivateRenderer();
            }
          }

          if (isFromOverlay && ARROW_KEYS.has(event.key)) {
            if (handleArrowNavigation(event)) return;
          }

          return;
        }

        if (isDragging() && isSpaceActivationKey(event)) {
          if (!event.repeat) {
            startSpaceDragRepositioning();
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (event.key === "Escape") {
          if (isHoldingKeys() || store.wasActivatedByToggle) {
            deactivateRenderer();
            return;
          }
        }

        if (isActivated() && !MODIFIER_KEYS.includes(event.key)) {
          event.preventDefault();
        }

        // After the window regains focus we briefly ignore activation keys to
        // prevent accidental activation from the modifier keys used to alt-tab.
        const didWindowJustRegainFocus = windowFocusListeners.isWithinRefocusGracePeriod();

        if (handleArrowNavigation(event)) return;
        if (handleEnterKeyActivation(event)) return;
        if (handleOpenFileShortcut(event)) return;
        if (handleContextMenuKey(event)) return;

        if (!didWindowJustRegainFocus) {
          handleActivationKeys(event);
        }
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (blockEnterIfNeeded(event)) return;

        if (isSpaceActivationKey(event) && isDragRepositioning()) {
          stopSpaceDragRepositioning();
          event.preventDefault();
          event.stopPropagation();
        }

        if (event.key === "Shift" && isShiftMultiSelecting()) {
          // If shift is released mid-drag, abort the in-progress drag
          // before committing. Without this, performCopyWithLabel ->
          // startCopy moves state out of "active+dragging", which makes
          // the subsequent pointerup early-return and silently swallows
          // the drag gesture along with its document.body.style.userSelect
          // cleanup.
          if (isDragging()) {
            cancelActiveDrag();
          }
          commitShiftMultiSelection();
          return;
        }

        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        const requiredModifiers = getRequiredModifiers(pluginRegistry.store.options);
        const isReleasingModifier =
          requiredModifiers.metaKey || requiredModifiers.ctrlKey
            ? isMac()
              ? !event.metaKey
              : !event.ctrlKey
            : (requiredModifiers.shiftKey && !event.shiftKey) ||
              (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = pluginRegistry.store.options.activationKey
          ? typeof pluginRegistry.store.options.activationKey === "function"
            ? pluginRegistry.store.options.activationKey(event)
            : parseActivationKey(pluginRegistry.store.options.activationKey)(event)
          : isCLikeKey(event.key, event.code);

        if (didJustCopy() || copyFeedbackCooldown.isActive()) {
          if (isReleasingActivationKey || isReleasingModifier) {
            clearCopyFeedbackCooldown();
            deactivateRenderer();
          }
          return;
        }

        if (!isHoldingKeys() && !isActivated()) return;
        if (isPromptMode()) return;

        const hasCustomShortcut = Boolean(pluginRegistry.store.options.activationKey);

        const isHoldMode = pluginRegistry.store.options.activationMode === "hold";
        const isDragGestureInProgress = isDragging();

        if (isActivated()) {
          const hasContextMenu = store.contextMenuPosition !== null;
          if (isReleasingModifier) {
            if (
              store.wasActivatedByToggle &&
              pluginRegistry.store.options.activationMode !== "hold"
            )
              return;
            if (hasContextMenu) return;
            deactivateRenderer();
          } else if (isHoldMode && isReleasingActivationKey) {
            keydownSpamTimer.clear();
            if (hasContextMenu) return;
            if (isDragGestureInProgress) return;
            deactivateRenderer();
          } else if (!hasCustomShortcut && isReleasingActivationKey) {
            keydownSpamTimer.clear();
          }
          return;
        }

        if (isReleasingActivationKey || isReleasingModifier) {
          if (store.wasActivatedByToggle && pluginRegistry.store.options.activationMode !== "hold")
            return;

          const shouldRelease =
            isHoldingKeys() || (activationHold.holdTimerFired() && isReleasingModifier);

          if (shouldRelease) {
            clearHoldTimer();
            const startTimestamp = activationHold.startTimestamp();
            const elapsedSinceHoldStart = startTimestamp
              ? Date.now() - startTimestamp
              : 0;
            const heldLongEnoughForActivation =
              elapsedSinceHoldStart >= MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS;
            const shouldActivateAfterCopy =
              activationHold.holdTimerFired() &&
              heldLongEnoughForActivation &&
              (pluginRegistry.store.options.allowActivationInsideInput ||
                !isKeyboardEventTriggeredByInput(event));
            resetCopyConfirmation();
            if (shouldActivateAfterCopy) {
              actions.activate();
            } else {
              actions.releaseHold();
            }
          } else {
            deactivateRenderer();
          }
        }
      },
      { capture: true },
    );

    eventListenerManager.addDocumentListener("copy", () => {
      if (isHoldingKeys()) {
        activationHold.markCopyWaiting();
      }
    });

    eventListenerManager.addWindowListener("keypress", blockEnterIfNeeded, {
      capture: true,
    });

    eventListenerManager.addWindowListener(
      "pointermove",
      (event: PointerEvent) => {
        if (!event.isPrimary) return;
        const isTouchPointer = event.pointerType === "touch";
        actions.setTouchMode(isTouchPointer);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        if (isSelectionInteractionLocked()) return;
        if (isTouchPointer && !isHoldingKeys() && !isActivated()) return;
        const isActiveState = isTouchPointer ? isHoldingKeys() : isActivated();
        // The flag check covers the small window after physical Shift
        // release but before the keyup handler commits — pointermove fires
        // with shiftKey=false in that gap, and unfreezing here would empty
        // frozenElements before commitShiftMultiSelection can read it.
        if (
          isActiveState &&
          !isPromptMode() &&
          isFrozenPhase() &&
          !event.shiftKey &&
          !isShiftMultiSelecting()
        ) {
          actions.unfreeze();
          clearArrowNavigation();
        }
        handlePointerMove(event.clientX, event.clientY, event.shiftKey);
      },
      { passive: true },
    );

    eventListenerManager.addWindowListener(
      "pointerdown",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (!event.isPrimary) return;
        actions.setTouchMode(event.pointerType === "touch");
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        if (toolbarMenuPosition() !== null) return;

        if (isPromptMode()) {
          const bounds = selectionBounds();
          const isClickOnSelection =
            bounds &&
            event.clientX >= bounds.x &&
            event.clientX <= bounds.x + bounds.width &&
            event.clientY >= bounds.y &&
            event.clientY <= bounds.y + bounds.height;

          if (isClickOnSelection) {
            void handleInputSubmit();
          } else {
            handleInputCancel();
          }
          return;
        }

        if (isSelectionInteractionLocked()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        const didHandle = handlePointerDown(event.clientX, event.clientY, event.shiftKey);
        if (didHandle) {
          if (event.pointerId !== undefined) {
            document.documentElement.setPointerCapture(event.pointerId);
          }
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointerup",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (!event.isPrimary) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        const isActive = isRendererActive() || isSelectionInteractionLocked() || isDragging();
        const hasModifierKeyHeld = event.metaKey || event.ctrlKey;
        handlePointerUp(event.clientX, event.clientY, hasModifierKeyHeld, event.shiftKey);
        if (isActive) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "contextmenu",
      (event: MouseEvent) => {
        if (!isRendererActive() || isCopying() || isPromptMode()) return;

        const isFromOverlay = isEventFromOverlay(event, "data-react-grab-ignore-events");
        const position = { x: event.clientX, y: event.clientY };
        const overlayFrozenElement =
          isFromOverlay && store.frozenElements.length > 1
            ? getFrozenElementAtPosition(position)
            : null;
        if (isFromOverlay && arrowNavigationState().isVisible) {
          clearArrowNavigation();
        } else if (isFromOverlay && !overlayFrozenElement) {
          return;
        }

        if (store.contextMenuPosition !== null) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const element = overlayFrozenElement ?? getElementAtPosition(event.clientX, event.clientY);
        if (!element) return;

        const existingFrozenElements = store.frozenElements;
        const isClickedElementAlreadyFrozen =
          existingFrozenElements.length > 1 && existingFrozenElements.includes(element);

        if (isClickedElementAlreadyFrozen) {
          freezeAllAnimations(existingFrozenElements);
        } else {
          freezeAllAnimations([element]);
          actions.setFrozenElement(element);
        }

        actions.setPointer(position);
        actions.freeze();
        openContextMenu(element, position);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener("pointercancel", (event: PointerEvent) => {
      if (!event.isPrimary) return;
      cancelActiveDrag();
    });

    eventListenerManager.addWindowListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;

        if (isRendererActive() || didJustDrag()) {
          event.preventDefault();
          event.stopImmediatePropagation();

          if (store.wasActivatedByToggle && !isPromptMode() && !event.shiftKey) {
            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              actions.setWasActivatedByToggle(false);
            }
          }
        }
      },
      { capture: true },
    );

    const windowFocusListeners = createWindowFocusListeners({
      grab,
      phase,
      activationLifecycle,
      activationHold,
      eventListenerManager,
      cancelActiveDrag: () => cancelActiveDrag(),
      stopShiftMultiSelecting: () => stopShiftMultiSelecting(),
    });

    createViewportSyncObserver({
      grab,
      phase,
      isEnabled,
      isThemeEnabled: () => pluginRegistry.store.theme.enabled,
      eventListenerManager,
    });

    eventListenerManager.addDocumentListener(
      "copy",
      (event: ClipboardEvent) => {
        if (isPromptMode() || isEventFromOverlay(event, "data-react-grab-ignore-events")) {
          return;
        }
        if (isRendererActive()) {
          event.preventDefault();
        }
      },
      { capture: true },
    );

    onCleanup(() => {
      eventListenerManager.abort();
      dragPreviewDebounce.cancel();
      keydownSpamTimer.dispose();
      clearCopyFeedbackCooldown();
      toolbarMenu.dispose();
      labelManager.dispose();
      autoScroller.stop();
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
      cursorOverride.clear();
      enterBlocker.restore();
    });

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
