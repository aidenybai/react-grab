import { type Accessor } from "solid-js";
import {
  DEFAULT_KEY_HOLD_DURATION_MS,
  INPUT_FOCUS_ACTIVATION_DELAY_MS,
  INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS,
  KEYDOWN_SPAM_TIMEOUT_MS,
  MODIFIER_KEYS,
} from "../constants.js";
import { isEnterCode } from "../utils/is-enter-code.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import {
  isKeyboardEventTriggeredByInput,
  hasTextSelectionInInput,
  hasTextSelectionOnPage,
} from "../utils/is-keyboard-event-triggered-by-input.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { freezeAllAnimations } from "../utils/freeze-animations.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { openFile } from "../utils/open-file.js";
import type { Position } from "../types.js";
import type { ActivationHoldController } from "./activation-hold.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { GrabStoreHandle } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";
import type { KeydownSpamTimer } from "./keydown-spam-timer.js";
import type { MenuHandlers } from "./menu-handlers.js";

type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface ActivationKeyHandlersInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  activationHold: ActivationHoldController;
  activationLifecycle: ActivationLifecycle;
  menuHandlers: MenuHandlers;
  keydownSpamTimer: KeydownSpamTimer;
  pointer: Accessor<Position>;
  didJustCopy: Accessor<boolean>;
  resetCopyConfirmation: () => void;
  preparePromptMode: (element: Element, x: number, y: number) => void;
  activatePromptMode: () => void;
}

export interface ActivationKeyHandlers {
  /**
   * Enter pressed without a modifier — either re-prompt the just-copied
   * element (replay flow) or commit a held selection by entering prompt mode
   * on the current element. Returns true if consumed.
   */
  handleEnterKeyActivation: (event: KeyboardEvent) => boolean;
  /** Cmd/Ctrl+O — open the currently-selected source file. Returns true if consumed. */
  handleOpenFileShortcut: (event: KeyboardEvent) => boolean;
  /** Shift+F10 / ContextMenu — open the context menu via keyboard. Returns true if consumed. */
  handleContextMenuKey: (event: KeyboardEvent) => boolean;
  /**
   * The catch-all activation key handler — observes Cmd/Ctrl+modifier
   * sequences to either start a hold-to-activate timer, schedule the
   * keydown-spam deactivation, or release the hold state on modifier
   * keyup paths.
   */
  handleActivationKeys: (event: KeyboardEvent) => void;
}

export const createActivationKeyHandlers = (input: ActivationKeyHandlersInput): ActivationKeyHandlers => {
  const {
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
  } = input;
  const { store, actions } = grab;
  const {
    isActivated,
    isCopying,
    isPromptMode,
    isHoldingKeys,
    isSelectionInteractionLocked,
    isContextMenuOpen,
  } = phase;
  const { targetElement } = elementSelectors;
  const { activateRenderer, deactivateRenderer } = activationLifecycle;
  const { clearTimer: clearHoldTimer } = activationHold;
  const { openContextMenu } = menuHandlers;

  const handleEnterKeyActivation = (event: KeyboardEvent): boolean => {
    if (!isEnterCode(event.code)) return false;
    if (isKeyboardEventTriggeredByInput(event)) return false;
    if (isCopying()) return false;
    if (isSelectionInteractionLocked()) return false;

    const copiedElement = store.lastCopiedElement;
    const canActivateFromCopied =
      !isHoldingKeys() &&
      !isPromptMode() &&
      !isActivated() &&
      copiedElement &&
      isElementConnected(copiedElement) &&
      !store.labelInstances.some(
        (instance) => instance.status === "copied" || instance.status === "fading",
      );

    if (canActivateFromCopied) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const center = getBoundsCenter(createElementBounds(copiedElement));

      actions.setPointer(center);
      preparePromptMode(copiedElement, center.x, center.y);
      actions.setFrozenElement(copiedElement);
      actions.clearLastCopied();

      activatePromptMode();
      if (!isActivated()) {
        activateRenderer();
      }
      return true;
    }

    const canActivateFromHolding = isHoldingKeys() && !isPromptMode();

    if (canActivateFromHolding) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const element = store.frozenElement || targetElement();
      if (element) {
        preparePromptMode(element, pointer().x, pointer().y);
      }

      actions.setPointer({ x: pointer().x, y: pointer().y });
      if (element) {
        actions.setFrozenElement(element);
      }
      activatePromptMode();

      keydownSpamTimer.clear();

      if (!isActivated()) {
        activateRenderer();
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

    const wasHandled = pluginRegistry.hooks.onOpenFile(filePath, lineNumber ?? undefined);
    if (!wasHandled) {
      openFile(filePath, lineNumber ?? undefined, pluginRegistry.hooks.transformOpenFileUrl);
    }
    return true;
  };

  const handleContextMenuKey = (event: KeyboardEvent): boolean => {
    if (!isActivated()) return false;
    if (isCopying() || isPromptMode()) return false;
    if (isContextMenuOpen()) return false;

    const isShiftF10 = event.key === "F10" && event.shiftKey;
    const isContextMenuKey = event.key === "ContextMenu";
    if (!isShiftF10 && !isContextMenuKey) return false;

    const existingFrozenElements = store.frozenElements;
    const hasMultiFrozenSelection = existingFrozenElements.length > 1;
    const element =
      (hasMultiFrozenSelection ? existingFrozenElements[0] : null) ||
      store.frozenElement ||
      targetElement();
    if (!element) return false;

    event.preventDefault();
    event.stopPropagation();

    const center = getBoundsCenter(createElementBounds(element));
    // Preserve an existing multi-frozen selection (e.g. Shift+click)
    // when invoking via keyboard, matching the mouse contextmenu
    // handler's behavior on a click that lands on the existing set.
    if (hasMultiFrozenSelection) {
      freezeAllAnimations(existingFrozenElements);
    } else {
      freezeAllAnimations([element]);
      actions.setFrozenElement(element);
    }
    actions.setPointer(center);
    actions.freeze();
    openContextMenu(element, center);
    return true;
  };

  const handleActivationKeys = (event: KeyboardEvent): void => {
    if (
      !pluginRegistry.store.options.allowActivationInsideInput &&
      isKeyboardEventTriggeredByInput(event)
    ) {
      return;
    }

    if (!isTargetKeyCombination(event, pluginRegistry.store.options)) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !MODIFIER_KEYS.includes(event.key) &&
        !isEnterCode(event.code)
      ) {
        if (isActivated() && !store.wasActivatedByToggle) {
          deactivateRenderer();
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
      if (store.wasActivatedByToggle && pluginRegistry.store.options.activationMode !== "hold")
        return;
      if (event.repeat) return;

      // If the overlay gets stuck active (e.g. the modifier keyup was lost
      // during a window blur), repeated keydowns will auto-dismiss it after
      // 200ms of idle keyboard activity.
      keydownSpamTimer.schedule(() => deactivateRenderer(), KEYDOWN_SPAM_TIMEOUT_MS);
      return;
    }

    if (isHoldingKeys() && event.repeat) {
      if (activationHold.copyWaiting()) {
        const shouldActivate = activationHold.holdTimerFired();
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
        pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS;

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

  return {
    handleEnterKeyActivation,
    handleOpenFileShortcut,
    handleContextMenuKey,
    handleActivationKeys,
  };
};
