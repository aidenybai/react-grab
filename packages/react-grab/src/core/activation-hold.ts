import { createEffect, onCleanup } from "solid-js";
import type { createGrabStore } from "./store.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

export interface ActivationHoldController {
  /** Timestamp when the most recent hold timer started, or null if not holding. */
  startTimestamp: () => number | null;
  /**
   * True if the user pressed the copy combo (Ctrl/Cmd+C) while still holding
   * the activation key. Tells the hold timer to defer activation until the
   * copy finishes.
   */
  copyWaiting: () => boolean;
  /** Marks copyWaiting=true; called from the document "copy" listener. */
  markCopyWaiting: () => void;
  /**
   * True if the hold timer elapsed while copyWaiting was true, so the keyup
   * handler can activate after the clipboard operation finishes.
   */
  holdTimerFired: () => boolean;
  /** Clear all three copy-coordination fields (timestamp + waiting + fired). */
  resetCopyConfirmation: () => void;
  /** Cancel any pending hold timer; safe to call multiple times. */
  clearTimer: () => void;
}

/**
 * Owns the activation hold state machine: the timer that fires after
 * `keyHoldDuration` ms while the user is holding the activation key, plus
 * the Ctrl/Cmd+C coordination that lets the user copy while held without
 * losing the activation gesture.
 */
export const createActivationHoldController = (grab: GrabStoreHandle): ActivationHoldController => {
  const { store, actions, current } = grab;

  let timerId: number | null = null;
  let startTimestamp: number | null = null;
  let copyWaiting = false;
  let holdTimerFired = false;

  const clearTimer = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const resetCopyConfirmation = () => {
    copyWaiting = false;
    holdTimerFired = false;
    startTimestamp = null;
  };

  // The hold timer does not call activate when copyWaiting is true (the user
  // held the activation key and pressed Ctrl+C). Instead it sets holdTimerFired
  // so the keyup handler can activate after the clipboard operation finishes.
  createEffect(() => {
    if (current().state !== "holding") {
      clearTimer();
      return;
    }
    startTimestamp = Date.now();
    timerId = window.setTimeout(() => {
      timerId = null;
      if (copyWaiting) {
        holdTimerFired = true;
        return;
      }
      actions.activate();
    }, store.keyHoldDuration);
    onCleanup(clearTimer);
  });

  return {
    startTimestamp: () => startTimestamp,
    copyWaiting: () => copyWaiting,
    markCopyWaiting: () => {
      copyWaiting = true;
    },
    holdTimerFired: () => holdTimerFired,
    resetCopyConfirmation,
    clearTimer,
  };
};
