import { type Accessor } from "solid-js";
import {
  calculateDragDistance as calculateDragDistanceUtil,
  calculateDragRectangle as calculateDragRectangleUtil,
} from "../utils/drag-geometry.js";
import {
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  PENDING_DETECTION_STALENESS_MS,
} from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { createPageRectFromBounds } from "../utils/create-bounds-from-drag-rect.js";
import { freezeAllAnimations } from "../utils/freeze-animations.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { getElementAnchorRatio } from "../utils/get-element-anchor-ratio.js";
import {
  clearElementPositionCache,
  getElementAtPosition,
  getElementsAtPoint,
} from "../utils/get-element-at-position.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { getTagName } from "../utils/get-tag-name.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { isPositionInsideBounds } from "../utils/is-position-inside-bounds.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { getComponentDisplayName } from "./context.js";
import { getAutoScrollDirection, type createAutoScroller } from "./auto-scroll.js";
import type { Position } from "../types.js";
import type { CommentModeHandlers } from "./comment-mode-handlers.js";
import type { CopyOrchestrator } from "./copy-orchestrator.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { DragPreviewDebounce } from "./drag-preview-debounce.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";
import type { MenuHandlers } from "./menu-handlers.js";
import type { ShiftMultiSelectState } from "./shift-multi-select-state.js";
import type { SpaceDragRepositioning } from "./space-drag-repositioning.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;
type AutoScroller = ReturnType<typeof createAutoScroller>;

interface DragHandlersInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  autoScroller: AutoScroller;
  shiftMultiSelect: ShiftMultiSelectState;
  spaceDragRepositioning: SpaceDragRepositioning;
  copyOrchestrator: CopyOrchestrator;
  menuHandlers: MenuHandlers;
  commentModeHandlers: CommentModeHandlers;
  dragPreviewDebounce: DragPreviewDebounce;
  pointer: Accessor<Position>;
  isEnabled: Accessor<boolean>;
  isPendingContextMenuSelect: Accessor<boolean>;
  isDragRepositioning: Accessor<boolean>;
  setIsPendingContextMenuSelect: (value: boolean) => void;
  /** Read+clear the keyboardSelectedElement closure flag. */
  takeKeyboardSelectedElement: () => Element | null;
  /** Schedule a debounced drag-preview pointer update. */
  scheduleDragPreviewUpdate: (clientX: number, clientY: number) => void;
  setResolvedComponentName: (name: string | undefined) => void;
  clearArrowNavigation: () => void;
  toPageCoordinates: (clientX: number, clientY: number) => { pageX: number; pageY: number };
}

export interface DragHandlers {
  handlePointerMove: (clientX: number, clientY: number, isShiftHeld: boolean) => void;
  handlePointerDown: (
    clientX: number,
    clientY: number,
    isShiftHeld: boolean,
  ) => boolean;
  handlePointerUp: (
    clientX: number,
    clientY: number,
    hasModifierKeyHeld: boolean,
    isShiftHeld: boolean,
  ) => void;
  commitShiftMultiSelection: () => void;
  cancelActiveDrag: () => void;
  getFrozenElementAtPosition: (position: Position) => Element | null;
}

export const createDragHandlers = (input: DragHandlersInput): DragHandlers => {
  const {
    grab,
    pluginRegistry,
    phase,
    elementSelectors,
    autoScroller,
    shiftMultiSelect,
    spaceDragRepositioning,
    copyOrchestrator,
    menuHandlers,
    commentModeHandlers,
    dragPreviewDebounce,
    pointer,
    isEnabled,
    isPendingContextMenuSelect,
    setIsPendingContextMenuSelect,
    isDragRepositioning,
    takeKeyboardSelectedElement,
    scheduleDragPreviewUpdate,
    setResolvedComponentName,
    clearArrowNavigation,
    toPageCoordinates,
  } = input;
  const { store, actions } = grab;
  const {
    isDragging,
    isFrozenPhase,
    isPromptMode,
    isSelectionInteractionLocked,
  } = phase;
  const { isRendererActive } = elementSelectors;
  const {
    isActive: isShiftMultiSelecting,
    setActive: setIsShiftMultiSelecting,
    stop: stopShiftMultiSelecting,
  } = shiftMultiSelect;
  const { performCopyWithLabel, performCopyWithPerElementLabels } = copyOrchestrator;

  const calculateDragDistance = (endX: number, endY: number) =>
    calculateDragDistanceUtil(store.dragStart, endX, endY);
  const calculateDragRectangle = (endX: number, endY: number) =>
    calculateDragRectangleUtil(store.dragStart, endX, endY);
  const { openContextMenuOrRunPendingDefault } = menuHandlers;
  const { enterCommentModeForElement } = commentModeHandlers;

  const elementDetectionState = {
    latestPointerX: 0,
    latestPointerY: 0,
    lastDetectionTimestamp: 0,
    pendingDetectionScheduledAt: 0,
  };

  const handlePointerMove = (
    clientX: number,
    clientY: number,
    isShiftHeld: boolean,
  ) => {
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

  const handlePointerDown = (
    clientX: number,
    clientY: number,
    isShiftHeld: boolean,
  ): boolean => {
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

  const toggleShiftMultiSelection = (element: Element, pointerPosition: Position) => {
    const wasElementSelected = store.frozenElements.includes(element);
    const isFirstFrozenElement = store.frozenElements.length === 0;

    if (!wasElementSelected) {
      const bounds = createElementBounds(element);
      const anchorRatio = getElementAnchorRatio(bounds, pointerPosition);
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

    freezeAllAnimations(store.frozenElements);
    setIsShiftMultiSelecting(true);
    actions.setPointer(pointerPosition);
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

    const keyboardSelectedElement = takeKeyboardSelectedElement();
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
    spaceDragRepositioning.stop();
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

    const dragSelectionRect = wasDragGesture ? calculateDragRectangle(clientX, clientY) : null;

    if (wasDragGesture) {
      actions.endDrag();
    } else {
      actions.cancelDrag();
    }
    spaceDragRepositioning.stop();
    autoScroller.stop();
    document.body.style.userSelect = "";

    if (dragSelectionRect) {
      handleDragSelection(dragSelectionRect, hasModifierKeyHeld, isShiftHeld);
    } else {
      handleSingleClick(clientX, clientY, hasModifierKeyHeld, isShiftHeld);
    }
  };

  return {
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    commitShiftMultiSelection,
    cancelActiveDrag,
    getFrozenElementAtPosition,
  };
};
