import { type Accessor, type Setter } from "solid-js";
import {
  ARROW_KEYS,
  MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS,
  MODIFIER_KEYS,
} from "../constants.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { isEnterCode } from "../utils/is-enter-code.js";
import { isEventFromIgnoredOverlay, isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { isKeyboardEventTriggeredByInput } from "../utils/is-keyboard-event-triggered-by-input.js";
import { isMac } from "../utils/is-mac.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { parseActivationKey } from "../utils/parse-activation-key.js";
import { getRequiredModifiers } from "./keyboard-handlers.js";
import type { ActivationHoldController } from "./activation-hold.js";
import type { ActivationKeyHandlers } from "./activation-key-handlers.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { ArrowNavigationController } from "./arrow-navigation-controller.js";
import type { CopyFeedbackCooldown } from "./copy-feedback-cooldown.js";
import type { DragHandlers } from "./drag-handlers.js";
import type { EnterBlocker } from "./enter-blocker.js";
import type { createEventListenerManager } from "./events.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabPhaseSelectors } from "./selectors.js";
import type { KeydownSpamTimer } from "./keydown-spam-timer.js";
import type { ShiftMultiSelectState } from "./shift-multi-select-state.js";
import type { SpaceDragRepositioning } from "./space-drag-repositioning.js";
import type { ToolbarMenuController } from "./toolbar-menu-controller.js";
import type { WindowFocusListeners } from "./window-focus-listeners.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;
type EventListenerManagerHandle = ReturnType<typeof createEventListenerManager>;

interface KeyboardListenersInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  activationHold: ActivationHoldController;
  activationKeyHandlers: ActivationKeyHandlers;
  activationLifecycle: ActivationLifecycle;
  arrowNavigation: ArrowNavigationController;
  copyFeedbackCooldown: CopyFeedbackCooldown;
  dragHandlers: DragHandlers;
  enterBlocker: EnterBlocker;
  eventListenerManager: EventListenerManagerHandle;
  keydownSpamTimer: KeydownSpamTimer;
  shiftMultiSelect: ShiftMultiSelectState;
  spaceDragRepositioning: SpaceDragRepositioning;
  toolbarMenu: ToolbarMenuController;
  windowFocusListeners: WindowFocusListeners;
  isEnabled: Accessor<boolean>;
  isDragRepositioning: Accessor<boolean>;
  didJustCopy: Accessor<boolean>;
  setToolbarShakeCount: Setter<number>;
  resetCopyConfirmation: () => void;
  handleInputCancel: () => void;
}

/**
 * Registers the keydown + keyup listener bodies. They share a tightly-
 * coupled set of state machines (hold-timer, copy-feedback cooldown,
 * activation-key parser, toolbar-menu dismiss, prompt-mode, arrow-nav,
 * space-drag repositioning) so they are co-located here rather than
 * split into per-event modules.
 */
export const registerKeyboardListeners = (input: KeyboardListenersInput): void => {
  const {
    grab,
    pluginRegistry,
    phase,
    activationHold,
    activationKeyHandlers,
    activationLifecycle,
    arrowNavigation,
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
  } = input;
  const { store, actions } = grab;
  const { isActivated, isDragging, isHoldingKeys, isPromptMode, isContextMenuOpen } = phase;
  const { deactivateRenderer } = activationLifecycle;
  const {
    handleArrowNavigation,
  } = arrowNavigation;
  const {
    handleEnterKeyActivation,
    handleOpenFileShortcut,
    handleContextMenuKey,
    handleActivationKeys,
  } = activationKeyHandlers;
  const { cancelActiveDrag, commitShiftMultiSelection } = dragHandlers;
  const { blockEnterIfNeeded } = enterBlocker;
  const { isActive: isShiftMultiSelecting } = shiftMultiSelect;
  const { isActivationKey: isSpaceActivationKey, start: startSpaceDragRepositioning, stop: stopSpaceDragRepositioning } = spaceDragRepositioning;
  const { clear: clearCopyFeedbackCooldown } = copyFeedbackCooldown;
  const { clearTimer: clearHoldTimer } = activationHold;

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

      if (event.key === "Escape" && toolbarMenu.position() !== null) {
        toolbarMenu.dismiss();
        return;
      }

      // When the context menu is open, its own registerOverlayDismiss
      // listener handles Escape. Bail out so the global handler doesn't
      // fire deactivateRenderer first via the isFromOverlay branch
      // (the menu container now holds focus, so composedPath() includes
      // data-react-grab-ignore-events).
      if (event.key === "Escape" && isContextMenuOpen()) {
        return;
      }

      const isFromOverlay =
        isEventFromIgnoredOverlay(event) && !isEnterToActivateInput;

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

      if (isEventFromIgnoredOverlay(event)) return;

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
        const hasContextMenu = isContextMenuOpen();
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
};
