import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import type { InternalPlugin, OverlayBounds, Position } from "../../types.js";
import {
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  PENDING_DETECTION_STALENESS_MS,
  DRAG_PREVIEW_DEBOUNCE_MS,
  FEEDBACK_DURATION_MS,
  DEFAULT_ACTION_ID,
  PLUGIN_PRIORITY_POINTER,
} from "../../constants.js";
import { createAutoScroller, getAutoScrollDirection } from "../auto-scroll.js";
import { getElementAtPosition } from "../../utils/get-element-at-position.js";
import { getElementsInDrag } from "../../utils/get-elements-in-drag.js";
import { isValidGrabbableElement } from "../../utils/is-valid-grabbable-element.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { createElementBounds } from "../../utils/create-element-bounds.js";
import {
  createBoundsFromDragRect,
  createPageRectFromBounds,
  createFlatOverlayBounds,
} from "../../utils/create-bounds-from-drag-rect.js";
import { freezeAllAnimations } from "../../utils/freeze-animations.js";
import { getElementCenter } from "../../utils/get-element-center.js";
import { isElementConnected } from "../../utils/is-element-connected.js";
import { onIdle } from "../../utils/on-idle.js";
import { getTagName } from "../../utils/get-tag-name.js";
import { combineBounds } from "../../utils/combine-bounds.js";

export const pointerPlugin: InternalPlugin = {
  name: "pointer",
  priority: PLUGIN_PRIORITY_POINTER,
  setup: (ctx) => {
    const { store, actions, registry, derived } = ctx;

    const {
      isHoldingKeys,
      isActivated,
      isFrozenPhase,
      isDragging,
      isCopying,
      isPromptMode,
      isRendererActive,
      selectionElement,
      frozenElementsBounds,
    } = derived;

    const didJustDrag = createMemo(
      () =>
        store.current.state === "active" &&
        store.current.phase === "justDragged",
    );

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;

      const frozenElements = store.frozenElements;
      if (frozenElements.length > 0) {
        const frozenBounds = frozenElementsBounds();
        if (frozenElements.length === 1) {
          const firstBounds = frozenBounds[0];
          if (firstBounds) return firstBounds;
        }
        const dragRect = store.frozenDragRect;
        if (dragRect) {
          const firstFrozenBounds = frozenBounds[0];
          return firstFrozenBounds ?? createBoundsFromDragRect(dragRect);
        }
        return createFlatOverlayBounds(combineBounds(frozenBounds));
      }

      const element = selectionElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const elementDetectionState = {
      lastDetectionTimestamp: 0,
      pendingDetectionScheduledAt: 0,
      latestPointerX: 0,
      latestPointerY: 0,
    };

    let dragPreviewDebounceTimerId: number | null = null;
    const [debouncedDragPointer, setDebouncedDragPointer] = createSignal<{
      x: number;
      y: number;
    } | null>(null);

    const scheduleDragPreviewUpdate = (clientX: number, clientY: number) => {
      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
      }
      setDebouncedDragPointer(null);
      dragPreviewDebounceTimerId = window.setTimeout(() => {
        setDebouncedDragPointer({ x: clientX, y: clientY });
        dragPreviewDebounceTimerId = null;
      }, DRAG_PREVIEW_DEBOUNCE_MS);
    };

    const autoScroller = createAutoScroller(
      () => store.pointer,
      () => isDragging(),
    );

    let isPendingContextMenuSelect = false;
    let pendingDefaultActionId: string | null = null;

    let keyboardSelectedElement: Element | null = null;

    const toPageCoordinates = (clientX: number, clientY: number) => ({
      pageX: clientX + window.scrollX,
      pageY: clientY + window.scrollY,
    });

    const calculateDragDistance = (endX: number, endY: number) => {
      const { pageX: endPageX, pageY: endPageY } = toPageCoordinates(
        endX,
        endY,
      );

      return {
        x: Math.abs(endPageX - store.dragStart.x),
        y: Math.abs(endPageY - store.dragStart.y),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(
        store.pointer.x,
        store.pointer.y,
      );

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const { pageX: endPageX, pageY: endPageY } = toPageCoordinates(
        endX,
        endY,
      );

      const dragPageX = Math.min(store.dragStart.x, endPageX);
      const dragPageY = Math.min(store.dragStart.y, endPageY);
      const dragWidth = Math.abs(endPageX - store.dragStart.x);
      const dragHeight = Math.abs(endPageY - store.dragStart.y);

      return {
        x: dragPageX - window.scrollX,
        y: dragPageY - window.scrollY,
        width: dragWidth,
        height: dragHeight,
      };
    };

    const dragBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;

      if (!isDraggingBeyondThreshold()) return undefined;

      const drag = calculateDragRectangle(store.pointer.x, store.pointer.y);

      return {
        borderRadius: "0px",
        height: drag.height,
        transform: "none",
        width: drag.width,
        x: drag.x,
        y: drag.y,
      };
    });

    const dragPreviewBounds = createMemo((): OverlayBounds[] => {
      void store.viewportVersion;

      if (!isDraggingBeyondThreshold()) return [];

      const pointer = debouncedDragPointer();
      if (!pointer) return [];

      const drag = calculateDragRectangle(pointer.x, pointer.y);
      const elements = getElementsInDrag(drag, isValidGrabbableElement);
      const previewElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(drag, isValidGrabbableElement, false);

      return previewElements.map((element) => createElementBounds(element));
    });

    const selectionBoundsMultiple = createMemo((): OverlayBounds[] => {
      const previewBounds = dragPreviewBounds();
      if (previewBounds.length > 0) {
        return previewBounds;
      }
      return frozenElementsBounds();
    });

    const dragVisible = createMemo(
      () =>
        registry.store.theme.enabled &&
        registry.store.theme.dragBox.enabled &&
        isRendererActive() &&
        isDraggingBeyondThreshold(),
    );

    createEffect(() => {
      if (
        store.current.state !== "active" ||
        store.current.phase !== "justDragged"
      )
        return;
      const timerId = setTimeout(() => {
        actions.finishJustDragged();
      }, FEEDBACK_DURATION_MS);
      onCleanup(() => clearTimeout(timerId));
    });

    const openContextMenu = (element: Element, position: Position) => {
      actions.showContextMenu(position, element);
      ctx.shared.clearArrowNavigation?.();
      ctx.shared.dismissAllPopups?.();
      registry.hooks.onContextMenu(element, position);
    };

    const enterCommentModeForElement = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      actions.setPendingCommentMode(false);
      actions.clearInputText();
      actions.enterPromptMode({ x: positionX, y: positionY }, element);
    };

    const runPendingDefaultAction = (element: Element, position: Position) => {
      const actionId = pendingDefaultActionId;
      pendingDefaultActionId = null;
      if (!actionId) return;

      const action = registry.store.actions.find(
        (registeredAction) => registeredAction.id === actionId,
      );
      if (!action) {
        ctx.shared.handleSetDefaultAction?.(DEFAULT_ACTION_ID);
        openContextMenu(element, position);
        return;
      }

      const elementBounds = createElementBounds(element);
      if (ctx.shared.buildActionContext) {
        const context = ctx.shared.buildActionContext({
          element,
          filePath: store.selectionFilePath ?? undefined,
          lineNumber: store.selectionLineNumber ?? undefined,
          tagName: getTagName(element) || undefined,
          componentName: undefined,
          position,
          shouldDeferHideContextMenu: false,
          performWithFeedbackOptions: {
            fallbackBounds: elementBounds,
            fallbackSelectionBounds: [elementBounds],
            position,
          },
        });
        action.onAction(context);
      }
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (
        isPromptMode() ||
        isFrozenPhase() ||
        store.contextMenuPosition !== null
      )
        return;

      actions.setPointer({ x: clientX, y: clientY });

      elementDetectionState.latestPointerX = clientX;
      elementDetectionState.latestPointerY = clientY;

      const now = performance.now();
      const isDetectionPending =
        elementDetectionState.pendingDetectionScheduledAt > 0 &&
        now - elementDetectionState.pendingDetectionScheduledAt <
          PENDING_DETECTION_STALENESS_MS;
      if (
        now - elementDetectionState.lastDetectionTimestamp >=
          ELEMENT_DETECTION_THROTTLE_MS &&
        !isDetectionPending
      ) {
        elementDetectionState.lastDetectionTimestamp = now;
        elementDetectionState.pendingDetectionScheduledAt = now;
        onIdle(() => {
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
        scheduleDragPreviewUpdate(clientX, clientY);

        const direction = getAutoScrollDirection(clientX, clientY);
        const isNearEdge =
          direction.top ||
          direction.bottom ||
          direction.left ||
          direction.right;

        if (isNearEdge && !autoScroller.isActive()) {
          autoScroller.start();
        } else if (!isNearEdge && autoScroller.isActive()) {
          autoScroller.stop();
        }
      }
    };

    const handlePointerDown = (clientX: number, clientY: number) => {
      if (!isRendererActive() || isCopying()) return false;

      actions.startDrag({ x: clientX, y: clientY });
      actions.setPointer({ x: clientX, y: clientY });
      document.body.style.userSelect = "none";

      scheduleDragPreviewUpdate(clientX, clientY);

      registry.hooks.onDragStart(
        clientX + window.scrollX,
        clientY + window.scrollY,
      );

      return true;
    };

    const handleDragSelection = (
      dragSelectionRect: ReturnType<typeof calculateDragRectangle>,
      hasModifierKeyHeld: boolean,
    ) => {
      const elements = getElementsInDrag(
        dragSelectionRect,
        isValidGrabbableElement,
      );
      const selectedElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(
              dragSelectionRect,
              isValidGrabbableElement,
              false,
            );

      if (selectedElements.length === 0) return;

      freezeAllAnimations(selectedElements);

      registry.hooks.onDragEnd(selectedElements, dragSelectionRect);
      const firstElement = selectedElements[0];
      const center = getElementCenter(firstElement);

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

      if (isPendingContextMenuSelect) {
        isPendingContextMenuSelect = false;
        if (pendingDefaultActionId) {
          runPendingDefaultAction(firstElement, center);
        } else {
          openContextMenu(firstElement, center);
        }
        return;
      }

      const shouldDeactivateAfter =
        store.wasActivatedByToggle && !hasModifierKeyHeld;

      ctx.shared.performCopyWithLabel?.({
        element: firstElement,
        cursorX: center.x,
        selectedElements,
        shouldDeactivateAfter,
        dragRect,
      });
    };

    const handleSingleClick = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
    ) => {
      const validFrozenElement = isElementConnected(store.frozenElement)
        ? store.frozenElement
        : null;

      const validKeyboardSelectedElement = isElementConnected(
        keyboardSelectedElement,
      )
        ? keyboardSelectedElement
        : null;

      const element =
        validFrozenElement ??
        validKeyboardSelectedElement ??
        getElementAtPosition(clientX, clientY) ??
        (isElementConnected(store.detectedElement)
          ? store.detectedElement
          : null);
      if (!element) return;

      const didSelectViaKeyboard =
        !validFrozenElement && validKeyboardSelectedElement === element;

      let positionX: number;
      let positionY: number;

      if (validFrozenElement) {
        positionX = store.pointer.x;
        positionY = store.pointer.y;
      } else if (didSelectViaKeyboard) {
        const elementCenter = getElementCenter(element);
        positionX = elementCenter.x;
        positionY = elementCenter.y;
      } else {
        positionX = clientX;
        positionY = clientY;
      }

      keyboardSelectedElement = null;

      if (store.pendingCommentMode) {
        enterCommentModeForElement(element, positionX, positionY);
        return;
      }

      if (isPendingContextMenuSelect) {
        isPendingContextMenuSelect = false;
        const { wasIntercepted } = registry.hooks.onElementSelect(element);
        if (wasIntercepted) return;

        freezeAllAnimations([element]);
        actions.setFrozenElement(element);
        const position = { x: positionX, y: positionY };
        actions.setPointer(position);
        actions.freeze();
        if (pendingDefaultActionId) {
          runPendingDefaultAction(element, position);
        } else {
          openContextMenu(element, position);
        }
        return;
      }

      const shouldDeactivateAfter =
        store.wasActivatedByToggle && !hasModifierKeyHeld;

      actions.setLastGrabbed(element);

      ctx.shared.performCopyWithLabel?.({
        element,
        cursorX: positionX,
        shouldDeactivateAfter,
      });
    };

    const cancelActiveDrag = () => {
      if (!isDragging()) return;
      actions.cancelDrag();
      autoScroller.stop();
      document.body.style.userSelect = "";
    };

    const handlePointerUp = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
    ) => {
      if (!isDragging()) return;

      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
        dragPreviewDebounceTimerId = null;
      }
      setDebouncedDragPointer(null);

      const dragDistance = calculateDragDistance(clientX, clientY);
      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX ||
        dragDistance.y > DRAG_THRESHOLD_PX;

      // HACK: Calculate drag rectangle BEFORE ending drag, because endDrag resets dragStart
      const dragSelectionRect = wasDragGesture
        ? calculateDragRectangle(clientX, clientY)
        : null;

      if (wasDragGesture) {
        actions.endDrag();
      } else {
        actions.cancelDrag();
      }
      autoScroller.stop();
      document.body.style.userSelect = "";

      if (dragSelectionRect) {
        handleDragSelection(dragSelectionRect, hasModifierKeyHeld);
      } else {
        handleSingleClick(clientX, clientY, hasModifierKeyHeld);
      }
    };

    ctx.onPointerMove((event: PointerEvent) => {
      if (!event.isPrimary) return false;
      const isTouchPointer = event.pointerType === "touch";
      actions.setTouchMode(isTouchPointer);
      if (isEventFromOverlay(event, "data-react-grab-ignore-events"))
        return false;
      if (store.contextMenuPosition !== null) return false;
      if (isTouchPointer && !isHoldingKeys() && !isActivated()) return false;
      const isActiveState = isTouchPointer ? isHoldingKeys() : isActivated();
      if (isActiveState && !isPromptMode() && isFrozenPhase()) {
        actions.unfreeze();
        ctx.shared.clearArrowNavigation?.();
      }
      handlePointerMove(event.clientX, event.clientY);
      return false;
    });

    ctx.onPointerDown((event: PointerEvent) => {
      if (event.button !== 0) return false;
      if (!event.isPrimary) return false;
      actions.setTouchMode(event.pointerType === "touch");
      if (isEventFromOverlay(event, "data-react-grab-ignore-events"))
        return false;
      if (store.contextMenuPosition !== null) return false;

      if (isPromptMode()) {
        const bounds = selectionBounds();
        const isClickOnSelection =
          bounds &&
          event.clientX >= bounds.x &&
          event.clientX <= bounds.x + bounds.width &&
          event.clientY >= bounds.y &&
          event.clientY <= bounds.y + bounds.height;

        if (isClickOnSelection) {
          ctx.shared.handleInputSubmit?.();
        } else {
          ctx.shared.handleInputCancel?.();
        }
        return true;
      }

      const didHandle = handlePointerDown(event.clientX, event.clientY);
      if (didHandle) {
        document.documentElement.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }

      return false;
    });

    ctx.onPointerUp((event: PointerEvent) => {
      if (event.button !== 0) return false;
      if (!event.isPrimary) return false;
      if (isEventFromOverlay(event, "data-react-grab-ignore-events"))
        return false;
      if (store.contextMenuPosition !== null) return false;
      const isActive = isRendererActive() || isCopying() || isDragging();
      const hasModifierKeyHeld = event.metaKey || event.ctrlKey;
      handlePointerUp(event.clientX, event.clientY, hasModifierKeyHeld);
      if (isActive) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    });

    ctx.onContextMenu((event: MouseEvent) => {
      if (!isRendererActive() || isCopying() || isPromptMode()) return false;

      const isFromOverlay = isEventFromOverlay(
        event,
        "data-react-grab-ignore-events",
      );
      if (isFromOverlay && ctx.shared.hasArrowNavigation?.()) {
        ctx.shared.clearArrowNavigation?.();
      } else if (isFromOverlay) {
        return false;
      }

      if (store.contextMenuPosition !== null) {
        event.preventDefault();
        return true;
      }

      event.preventDefault();
      event.stopPropagation();

      const element = getElementAtPosition(event.clientX, event.clientY);
      if (!element) return true;

      const existingFrozenElements = store.frozenElements;
      const isClickedElementAlreadyFrozen =
        existingFrozenElements.length > 1 &&
        existingFrozenElements.includes(element);

      if (isClickedElementAlreadyFrozen) {
        freezeAllAnimations(existingFrozenElements);
      } else {
        freezeAllAnimations([element]);
        actions.setFrozenElement(element);
      }

      const position = { x: event.clientX, y: event.clientY };
      actions.setPointer(position);
      actions.freeze();
      openContextMenu(element, position);
      return true;
    });

    ctx.events.addWindowListener("pointercancel", (event: PointerEvent) => {
      if (!event.isPrimary) return;
      cancelActiveDrag();
    });

    ctx.events.addWindowListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopImmediatePropagation();

          if (store.wasActivatedByToggle && !isCopying() && !isPromptMode()) {
            if (!isHoldingKeys()) {
              ctx.shared.deactivateRenderer?.();
            } else {
              actions.setWasActivatedByToggle(false);
            }
          }
        }
      },
      { capture: true },
    );

    ctx.shared.openContextMenu = (position: Position, element: Element) => {
      openContextMenu(element, position);
    };
    createEffect(() => {
      ctx.shared.setHasDragPreviewBounds?.(dragPreviewBounds().length > 0);
    });
    ctx.shared.cancelActiveDrag = () => cancelActiveDrag();
    ctx.shared.getDragBounds = () => dragBounds() ?? null;
    ctx.shared.isDragBoxVisible = () => Boolean(dragVisible());

    ctx.provide("dragVisible", () => dragVisible());
    ctx.provide("dragBounds", () => dragBounds());
    ctx.provide("selectionBoundsMultiple", () => selectionBoundsMultiple());
    ctx.provide(
      "selectionShouldSnap",
      () => store.frozenElements.length > 0 || dragPreviewBounds().length > 0,
    );

    return () => {
      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
        dragPreviewDebounceTimerId = null;
      }
      autoScroller.stop();
      keyboardSelectedElement = null;
      isPendingContextMenuSelect = false;
      pendingDefaultActionId = null;
      document.body.style.userSelect = "";
      ctx.shared.openContextMenu = undefined;
      ctx.shared.setHasDragPreviewBounds?.(false);
      ctx.shared.cancelActiveDrag = undefined;
    };
  },
};
