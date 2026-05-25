import { type Accessor } from "solid-js";
import { freezeAllAnimations } from "../utils/freeze-animations.js";
import { getElementAtPosition } from "../utils/get-element-at-position.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import type { ActivationHoldController } from "./activation-hold.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { ArrowNavigationController } from "./arrow-navigation-controller.js";
import type { DragHandlers } from "./drag-handlers.js";
import type { EnterBlocker } from "./enter-blocker.js";
import type { createEventListenerManager } from "./events.js";
import type { createGrabStore } from "./store.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";
import type { MenuHandlers } from "./menu-handlers.js";
import type { OverlayBounds } from "../types.js";
import type { PromptModeHandlers } from "./prompt-mode-handlers.js";
import type { ShiftMultiSelectState } from "./shift-multi-select-state.js";
import type { ToolbarMenuController } from "./toolbar-menu-controller.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type EventListenerManagerHandle = ReturnType<typeof createEventListenerManager>;

interface PointerListenersInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  activationHold: ActivationHoldController;
  activationLifecycle: ActivationLifecycle;
  arrowNavigation: ArrowNavigationController;
  dragHandlers: DragHandlers;
  enterBlocker: EnterBlocker;
  eventListenerManager: EventListenerManagerHandle;
  menuHandlers: MenuHandlers;
  promptModeHandlers: PromptModeHandlers;
  shiftMultiSelect: ShiftMultiSelectState;
  toolbarMenu: ToolbarMenuController;
  selectionBounds: Accessor<OverlayBounds | undefined>;
  didJustDrag: Accessor<boolean>;
}

/**
 * Registers the pointer/click cluster of listeners: copy (mark-copy-waiting),
 * keypress (enter-blocker), pointermove/down/up, contextmenu, pointercancel,
 * click. These coordinate the drag handlers, prompt-mode commit, toolbar
 * menu, and context-menu opening logic.
 */
export const registerPointerListeners = (input: PointerListenersInput): void => {
  const {
    grab,
    phase,
    elementSelectors,
    activationHold,
    activationLifecycle,
    arrowNavigation,
    dragHandlers,
    enterBlocker,
    eventListenerManager,
    menuHandlers,
    promptModeHandlers,
    shiftMultiSelect,
    toolbarMenu,
    selectionBounds,
    didJustDrag,
  } = input;
  const { store, actions } = grab;
  const {
    isActivated,
    isCopying,
    isDragging,
    isFrozenPhase,
    isHoldingKeys,
    isPromptMode,
    isSelectionInteractionLocked,
  } = phase;
  const { isRendererActive } = elementSelectors;
  const { deactivateRenderer } = activationLifecycle;
  const { clearArrowNavigation, state: arrowNavigationState } = arrowNavigation;
  const {
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    cancelActiveDrag,
    getFrozenElementAtPosition,
  } = dragHandlers;
  const { blockEnterIfNeeded } = enterBlocker;
  const { openContextMenu } = menuHandlers;
  const { handleInputSubmit, handleInputCancel } = promptModeHandlers;
  const { isActive: isShiftMultiSelecting } = shiftMultiSelect;

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
      if (toolbarMenu.position() !== null) return;

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
};
