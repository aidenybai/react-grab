import { isEnterCode } from "../utils/is-enter-code.js";
import { setupKeyboardEventClaimer } from "./keyboard-handlers.js";
import type { Accessor } from "solid-js";
import type { createGrabStore } from "./store.js";
import type { createEventListenerManager } from "./events.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type EventListenerManagerHandle = ReturnType<typeof createEventListenerManager>;

interface EnterBlockerInput {
  grab: GrabStoreHandle;
  isActivated: Accessor<boolean>;
  isHoldingKeys: Accessor<boolean>;
  isPromptMode: Accessor<boolean>;
  eventListenerManager: EventListenerManagerHandle;
}

export interface EnterBlocker {
  /**
   * Inspect a keyboard event and, if it's an Enter that should be swallowed
   * (overlay is active or holding-keys, not in prompt mode, not toggle-
   * activated), prevent its default + propagation and claim it for the
   * keyboardClaimer. Returns whether the event was blocked so the caller
   * can short-circuit further handling.
   */
  blockEnterIfNeeded: (event: KeyboardEvent) => boolean;
  /** Restore the original Event.prototype.key descriptor at dispose time. */
  restore: () => void;
}

/**
 * Prevents the Enter key from reaching page handlers while the overlay is
 * active. Uses the keyboard claimer to monkey-patch Event.prototype.key so
 * a stopImmediatePropagation in capture phase still leaves room for our
 * own handlers to read the original key value via the saved descriptor.
 *
 * Registers itself for keydown/keyup/keypress at the document level (capture
 * phase) so it runs before any page listener.
 */
export const createEnterBlocker = (input: EnterBlockerInput): EnterBlocker => {
  const { grab, isActivated, isHoldingKeys, isPromptMode, eventListenerManager } = input;
  const { store } = grab;
  const keyboardClaimer = setupKeyboardEventClaimer();

  const blockEnterIfNeeded = (event: KeyboardEvent): boolean => {
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
      isEnterKey && isOverlayActive && !isPromptMode() && !store.wasActivatedByToggle;

    if (shouldBlockEnter) {
      keyboardClaimer.claimedEvents.add(event);
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
    return false;
  };

  eventListenerManager.addDocumentListener("keydown", blockEnterIfNeeded, { capture: true });
  eventListenerManager.addDocumentListener("keyup", blockEnterIfNeeded, { capture: true });
  eventListenerManager.addDocumentListener("keypress", blockEnterIfNeeded, { capture: true });

  return {
    blockEnterIfNeeded,
    restore: keyboardClaimer.restore,
  };
};
