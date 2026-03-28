import { createEffect, onCleanup } from "solid-js";
import type { InternalPlugin } from "../../types.js";
import {
  isKeyboardEventTriggeredByInput,
  hasTextSelectionInInput,
  hasTextSelectionOnPage,
} from "../../utils/is-keyboard-event-triggered-by-input.js";
import { isTargetKeyCombination } from "../../utils/is-target-key-combination.js";
import { parseActivationKey } from "../../utils/parse-activation-key.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { isElementConnected } from "../../utils/is-element-connected.js";
import { isEnterCode } from "../../utils/is-enter-code.js";
import { isCLikeKey } from "../../utils/is-c-like-key.js";
import { isMac } from "../../utils/is-mac.js";
import { openFile } from "../../utils/open-file.js";
import { getElementCenter } from "../../utils/get-element-center.js";
import {
  setupKeyboardEventClaimer,
  getRequiredModifiers,
} from "../keyboard-handlers.js";
import {
  MODIFIER_KEYS,
  KEYDOWN_SPAM_TIMEOUT_MS,
  DEFAULT_KEY_HOLD_DURATION_MS,
  INPUT_FOCUS_ACTIVATION_DELAY_MS,
  INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS,
  MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS,
  WINDOW_REFOCUS_GRACE_PERIOD_MS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
} from "../../constants.js";

export const keyboardPlugin: InternalPlugin = {
  name: "keyboard",
  priority: 10,
  setup: (ctx) => {
    const { store, actions, events, registry, derived } = ctx;
    const {
      isHoldingKeys,
      isActivated,
      isCopying,
      didJustCopy,
      isPromptMode,
      targetElement,
    } = derived;

    const activationHoldState = {
      timerId: null as number | null,
      startTimestamp: null as number | null,
      copyWaiting: false,
      holdTimerFired: false,
    };

    let keydownSpamTimerId: number | null = null;
    let lastWindowFocusTimestamp = 0;

    const clearHoldTimer = () => {
      if (activationHoldState.timerId !== null) {
        clearTimeout(activationHoldState.timerId);
        activationHoldState.timerId = null;
      }
    };

    const resetCopyConfirmation = () => {
      activationHoldState.copyWaiting = false;
      activationHoldState.holdTimerFired = false;
      activationHoldState.startTimestamp = null;
    };

    // When entering "holding" state, start a timer that fires activation
    createEffect(() => {
      if (store.current.state !== "holding") {
        clearHoldTimer();
        return;
      }
      activationHoldState.startTimestamp = Date.now();
      activationHoldState.timerId = window.setTimeout(() => {
        activationHoldState.timerId = null;
        if (activationHoldState.copyWaiting) {
          activationHoldState.holdTimerFired = true;
          return;
        }
        if (registry.store.options.activationMode !== "hold") {
          actions.setWasActivatedByToggle(true);
        }
        actions.activate();
      }, store.keyHoldDuration);
      onCleanup(clearHoldTimer);
    });

    const keyboardClaimer = setupKeyboardEventClaimer();

    const blockEnterIfNeeded = (event: KeyboardEvent) => {
      let originalKey: string;
      try {
        originalKey = keyboardClaimer.originalKeyDescriptor?.get
          ? keyboardClaimer.originalKeyDescriptor.get.call(event)
          : event.key;
      } catch {
        return false;
      }
      const isEnterKey = originalKey === "Enter" || isEnterCode(event.code);
      const isOverlayActive = isActivated() || isHoldingKeys();
      const shouldBlockEnter =
        isEnterKey &&
        isOverlayActive &&
        !isPromptMode() &&
        !store.wasActivatedByToggle;

      if (shouldBlockEnter) {
        keyboardClaimer.claimedEvents.add(event);
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    events.addDocumentListener("keydown", blockEnterIfNeeded, {
      capture: true,
    });
    events.addDocumentListener("keyup", blockEnterIfNeeded, {
      capture: true,
    });
    events.addDocumentListener("keypress", blockEnterIfNeeded, {
      capture: true,
    });

    const handleEnterKeyActivation = (event: KeyboardEvent): boolean => {
      if (!isEnterCode(event.code)) return false;
      if (isKeyboardEventTriggeredByInput(event)) return false;

      const copiedElement = store.lastCopiedElement;
      const canActivateFromCopied =
        !isHoldingKeys() &&
        !isPromptMode() &&
        !isActivated() &&
        copiedElement &&
        isElementConnected(copiedElement) &&
        !store.labelInstances.some(
          (instance) =>
            instance.status === "copied" || instance.status === "fading",
        );

      if (canActivateFromCopied) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const center = getElementCenter(copiedElement);

        actions.setPointer(center);
        ctx.shared.setCopyStartPosition?.(center, copiedElement);
        actions.clearInputText();
        actions.setFrozenElement(copiedElement);
        actions.clearLastCopied();

        ctx.shared.activatePromptMode?.();
        if (!isActivated()) {
          ctx.shared.activateRenderer?.();
        }
        return true;
      }

      const canActivateFromHolding = isHoldingKeys() && !isPromptMode();

      if (canActivateFromHolding) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const element = store.frozenElement || targetElement();
        if (element) {
          ctx.shared.setCopyStartPosition?.(
            { x: store.pointer.x, y: store.pointer.y },
            element,
          );
          actions.clearInputText();
        }

        actions.setPointer({ x: store.pointer.x, y: store.pointer.y });
        if (element) {
          actions.setFrozenElement(element);
        }
        ctx.shared.activatePromptMode?.();

        if (keydownSpamTimerId !== null) {
          window.clearTimeout(keydownSpamTimerId);
          keydownSpamTimerId = null;
        }

        if (!isActivated()) {
          ctx.shared.activateRenderer?.();
        }

        return true;
      }

      return false;
    };

    const handleOpenFileShortcut = (event: KeyboardEvent): boolean => {
      if (event.key?.toLowerCase() !== "o" || isPromptMode()) return false;
      if (!isActivated() || !(event.metaKey || event.ctrlKey)) return false;

      const filePath = store.selectionFilePath;
      const lineNumber = store.selectionLineNumber;
      if (!filePath) return false;

      event.preventDefault();
      event.stopPropagation();

      const wasHandled = registry.hooks.onOpenFile(
        filePath,
        lineNumber ?? undefined,
      );
      if (!wasHandled) {
        openFile(
          filePath,
          lineNumber ?? undefined,
          registry.hooks.transformOpenFileUrl,
        );
      }
      return true;
    };

    const handleActivationKeys = (event: KeyboardEvent): void => {
      if (
        !registry.store.options.allowActivationInsideInput &&
        isKeyboardEventTriggeredByInput(event)
      ) {
        return;
      }

      if (!isTargetKeyCombination(event, registry.store.options)) {
        if (
          (event.metaKey || event.ctrlKey) &&
          !MODIFIER_KEYS.includes(event.key) &&
          !isEnterCode(event.code)
        ) {
          if (isActivated() && !store.wasActivatedByToggle) {
            ctx.shared.deactivateRenderer?.();
          } else if (isHoldingKeys()) {
            clearHoldTimer();
            resetCopyConfirmation();
            actions.releaseHold();
          }
        }
        if (!isEnterCode(event.code) || !isHoldingKeys()) {
          return;
        }
      }

      if ((isActivated() || isHoldingKeys()) && !isPromptMode()) {
        event.preventDefault();
        if (isEnterCode(event.code)) {
          event.stopImmediatePropagation();
        }
      }

      if (isActivated()) {
        if (
          store.wasActivatedByToggle &&
          registry.store.options.activationMode !== "hold"
        )
          return;
        if (event.repeat) return;

        if (keydownSpamTimerId !== null) {
          window.clearTimeout(keydownSpamTimerId);
        }
        keydownSpamTimerId = window.setTimeout(() => {
          ctx.shared.deactivateRenderer?.();
        }, KEYDOWN_SPAM_TIMEOUT_MS);
        return;
      }

      if (isHoldingKeys() && event.repeat) {
        if (activationHoldState.copyWaiting) {
          const shouldActivate = activationHoldState.holdTimerFired;
          resetCopyConfirmation();
          if (shouldActivate) {
            actions.activate();
          }
        }
        return;
      }

      if (isCopying() || didJustCopy()) return;

      if (!isHoldingKeys()) {
        const keyHoldDuration =
          registry.store.options.keyHoldDuration ??
          DEFAULT_KEY_HOLD_DURATION_MS;

        let activationDuration = keyHoldDuration;
        if (isKeyboardEventTriggeredByInput(event)) {
          if (hasTextSelectionInInput(event)) {
            activationDuration += INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS;
          } else {
            activationDuration += INPUT_FOCUS_ACTIVATION_DELAY_MS;
          }
        } else if (hasTextSelectionOnPage()) {
          activationDuration += INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS;
        }
        resetCopyConfirmation();
        actions.startHold(activationDuration);
      }
    };

    // Registered via ctx.onKeyDown at priority 10 (runs first in the interceptor chain).
    // Handles early concerns (disabled shake, prompt-mode activation key cancel, Escape)
    // and late catch-all concerns (Enter activation, open file, activation keys).
    //
    // In the interceptor chain, returning true claims the event so later plugins don't see it.
    // Returning false lets the event continue to the next plugin (e.g., navigation at 20).
    ctx.onKeyDown((event) => {
      // Always try to block Enter propagation when overlay is active
      blockEnterIfNeeded(event);

      // If disabled, shake the toolbar on activation key press
      if (!ctx.shared.isEnabled?.()) {
        if (
          isTargetKeyCombination(event, registry.store.options) &&
          !event.repeat
        ) {
          ctx.shared.shakeToolbar?.();
        }
        return true; // Claim the event — nothing else should handle keys while disabled
      }

      // Prompt mode: activation key cancels input
      const isEnterToActivateInput =
        isEnterCode(event.code) && isHoldingKeys() && !isPromptMode();

      const isFromReactGrabInput = isEventFromOverlay(
        event,
        "data-react-grab-input",
      );
      if (
        isPromptMode() &&
        isTargetKeyCombination(event, registry.store.options) &&
        !event.repeat &&
        !isFromReactGrabInput
      ) {
        event.preventDefault();
        event.stopPropagation();
        ctx.shared.handleInputCancel?.();
        return true;
      }

      // Escape handling: dismiss popups, abort pending sessions, deactivate
      if (event.key === "Escape") {
        // Let popup-owning plugins handle Escape for their own dropdowns first
        // (they run at higher priority numbers, but if they're not present,
        //  the keyboard plugin handles Escape as the catch-all)

        if (store.pendingAbortSessionId) {
          event.preventDefault();
          event.stopPropagation();
          actions.setPendingAbortSessionId(null);
          return true;
        }

        const isFromOverlay =
          isEventFromOverlay(event, "data-react-grab-ignore-events") &&
          !isEnterToActivateInput;

        if (isPromptMode() || isFromOverlay) {
          if (isPromptMode()) {
            ctx.shared.handleInputCancel?.();
          } else if (store.wasActivatedByToggle) {
            ctx.shared.deactivateRenderer?.();
          }
          return true;
        }

        if (ctx.shared.isAgentProcessing?.()) {
          return true;
        }

        if (isHoldingKeys() || store.wasActivatedByToggle) {
          ctx.shared.deactivateRenderer?.();
          return true;
        }
      }

      // If from overlay (but not Enter-to-activate), let the event pass through
      // for overlay-specific handlers (arrow navigation in overlay, etc.)
      const isFromOverlay =
        isEventFromOverlay(event, "data-react-grab-ignore-events") &&
        !isEnterToActivateInput;

      if (isPromptMode() || isFromOverlay) {
        // Don't claim — let other plugins (navigation) handle arrow keys in overlay
        return false;
      }

      // Window refocus grace period check
      const didWindowJustRegainFocus =
        Date.now() - lastWindowFocusTimestamp < WINDOW_REFOCUS_GRACE_PERIOD_MS;

      // Let navigation and action cycle plugins handle their keys first
      // by not claiming — return false so they get a chance.
      // These handlers (Enter activation, open file, activation keys) are
      // catch-all handlers that should only run if no other plugin claimed the event.
      // But since keyboard is priority 10 (runs first), we need to let the event
      // pass through for navigation (20) and action cycle (50) to handle.
      //
      // However, the interceptor chain means if we return false here, every plugin
      // sees the event. Only the last unclaimed event falls through without handling.
      //
      // The solution: Don't try to claim events that other plugins should handle.
      // Only claim events that are definitively keyboard plugin's responsibility.

      // Enter key activation (prompt mode from last copied or from hold)
      if (handleEnterKeyActivation(event)) return true;

      // Open file shortcut (Cmd/Ctrl+O)
      if (handleOpenFileShortcut(event)) return true;

      // Activation keys (hold to activate) — this is the catch-all
      if (!didWindowJustRegainFocus) {
        handleActivationKeys(event);
      }

      // Don't claim — let other plugins see the event too
      // (activation keys handler doesn't always need to claim)
      return false;
    });

    ctx.onKeyUp((event) => {
      if (blockEnterIfNeeded(event)) return true;

      const requiredModifiers = getRequiredModifiers(registry.store.options);
      const isReleasingModifier =
        requiredModifiers.metaKey || requiredModifiers.ctrlKey
          ? isMac()
            ? !event.metaKey
            : !event.ctrlKey
          : (requiredModifiers.shiftKey && !event.shiftKey) ||
            (requiredModifiers.altKey && !event.altKey);

      const isReleasingActivationKey = registry.store.options.activationKey
        ? typeof registry.store.options.activationKey === "function"
          ? registry.store.options.activationKey(event)
          : parseActivationKey(registry.store.options.activationKey)(event)
        : isCLikeKey(event.key, event.code);

      if (didJustCopy() || ctx.shared.isCopyFeedbackCooldownActive?.()) {
        if (isReleasingActivationKey || isReleasingModifier) {
          ctx.shared.clearCopyFeedbackCooldown?.();
          ctx.shared.deactivateRenderer?.();
        }
        return true;
      }

      if (!isHoldingKeys() && !isActivated()) return false;
      if (isPromptMode()) return false;

      const hasCustomShortcut = Boolean(registry.store.options.activationKey);

      const isHoldMode = registry.store.options.activationMode === "hold";

      if (isActivated()) {
        const hasContextMenu = store.contextMenuPosition !== null;
        if (isReleasingModifier) {
          if (
            store.wasActivatedByToggle &&
            registry.store.options.activationMode !== "hold"
          )
            return false;
          if (hasContextMenu) return false;
          ctx.shared.deactivateRenderer?.();
        } else if (isHoldMode && isReleasingActivationKey) {
          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = null;
          }
          if (hasContextMenu) return false;
          ctx.shared.deactivateRenderer?.();
        } else if (
          !hasCustomShortcut &&
          isReleasingActivationKey &&
          keydownSpamTimerId !== null
        ) {
          window.clearTimeout(keydownSpamTimerId);
          keydownSpamTimerId = null;
        }
        return true;
      }

      if (isReleasingActivationKey || isReleasingModifier) {
        if (
          store.wasActivatedByToggle &&
          registry.store.options.activationMode !== "hold"
        )
          return false;

        const shouldRelease =
          isHoldingKeys() ||
          (activationHoldState.holdTimerFired && isReleasingModifier);

        if (shouldRelease) {
          clearHoldTimer();
          const elapsedSinceHoldStart = activationHoldState.startTimestamp
            ? Date.now() - activationHoldState.startTimestamp
            : 0;
          const heldLongEnoughForActivation =
            elapsedSinceHoldStart >= MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS;
          const shouldActivateAfterCopy =
            activationHoldState.holdTimerFired &&
            heldLongEnoughForActivation &&
            (registry.store.options.allowActivationInsideInput ||
              !isKeyboardEventTriggeredByInput(event));
          resetCopyConfirmation();
          if (shouldActivateAfterCopy) {
            if (registry.store.options.activationMode !== "hold") {
              actions.setWasActivatedByToggle(true);
            }
            actions.activate();
          } else {
            actions.releaseHold();
          }
        } else {
          ctx.shared.deactivateRenderer?.();
        }
        return true;
      }

      return false;
    });

    events.addDocumentListener("copy", () => {
      if (isHoldingKeys()) {
        activationHoldState.copyWaiting = true;
      }
    });

    events.addWindowListener("keypress", blockEnterIfNeeded, {
      capture: true,
    });

    events.addWindowListener("blur", () => {
      ctx.shared.cancelActiveDrag?.();
      if (isHoldingKeys()) {
        clearHoldTimer();
        actions.releaseHold();
        resetCopyConfirmation();
      }
    });

    events.addWindowListener("focus", () => {
      lastWindowFocusTimestamp = Date.now();
    });

    events.addDocumentListener("visibilitychange", () => {
      if (document.hidden) {
        actions.clearGrabbedBoxes();
        const storeActivationTimestamp = store.activationTimestamp;
        if (
          isActivated() &&
          !isPromptMode() &&
          storeActivationTimestamp !== null &&
          Date.now() - storeActivationTimestamp > BLUR_DEACTIVATION_THRESHOLD_MS
        ) {
          ctx.shared.deactivateRenderer?.();
        }
      }
    });

    events.addWindowListener(
      "focusin",
      (event: FocusEvent) => {
        if (isEventFromOverlay(event, "data-react-grab")) {
          event.stopPropagation();
        }
      },
      { capture: true },
    );

    ctx.shared.clearHoldTimer = clearHoldTimer;
    ctx.shared.resetCopyConfirmation = resetCopyConfirmation;
    ctx.shared.isHoldingKeys = () => isHoldingKeys();

    return () => {
      clearHoldTimer();
      if (keydownSpamTimerId !== null) {
        window.clearTimeout(keydownSpamTimerId);
        keydownSpamTimerId = null;
      }
      keyboardClaimer.restore();
      resetCopyConfirmation();
    };
  },
};
