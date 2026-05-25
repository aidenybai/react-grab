import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { BLUR_DEACTIVATION_THRESHOLD_MS } from "../constants.js";
import type { ActivationHoldController } from "./activation-hold.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { createEventListenerManager } from "./events.js";
import type { createGrabStore } from "./store.js";
import type { GrabPhaseSelectors } from "./selectors.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type EventListenerManagerHandle = ReturnType<typeof createEventListenerManager>;

interface WindowFocusListenersInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  activationLifecycle: ActivationLifecycle;
  activationHold: ActivationHoldController;
  eventListenerManager: EventListenerManagerHandle;
  /** Called from blur to abort any in-progress drag gesture. */
  cancelActiveDrag: () => void;
  /** Called from blur so a stale shift-multi-select doesn't block future input. */
  stopShiftMultiSelecting: () => void;
  /**
   * Called from focus to update the last-window-focus timestamp used by
   * handleActivationKeys to suppress activation during the alt-tab grace
   * window.
   */
  setLastWindowFocusTimestamp: (timestamp: number) => void;
}

/**
 * Registers the four window/document focus-lifecycle listeners as a unit:
 *
 *   - visibilitychange: clear grabbed-box flashes, deactivate if hidden for
 *     more than BLUR_DEACTIVATION_THRESHOLD_MS (the page returning later
 *     should not feel "stuck active").
 *   - blur: cancel any in-progress drag, release the hold timer (modifier
 *     keyup is lost on blur), and stop shift-multi-select.
 *   - focus: record the timestamp so a key pressed during the alt-tab
 *     completion grace window doesn't re-arm activation.
 *   - focusin (capture): stop propagation for events that originate inside
 *     the overlay so the host page can't react to our own internal focus
 *     moves.
 */
export const createWindowFocusListeners = (input: WindowFocusListenersInput): void => {
  const {
    grab,
    phase,
    activationLifecycle,
    activationHold,
    eventListenerManager,
    cancelActiveDrag,
    stopShiftMultiSelecting,
    setLastWindowFocusTimestamp,
  } = input;
  const { store, actions } = grab;
  const { isActivated, isPromptMode, isHoldingKeys } = phase;
  const { deactivateRenderer } = activationLifecycle;

  eventListenerManager.addDocumentListener("visibilitychange", () => {
    if (!document.hidden) return;
    actions.clearGrabbedBoxes();
    const storeActivationTimestamp = store.activationTimestamp;
    if (
      isActivated() &&
      !isPromptMode() &&
      storeActivationTimestamp !== null &&
      Date.now() - storeActivationTimestamp > BLUR_DEACTIVATION_THRESHOLD_MS
    ) {
      deactivateRenderer();
    }
  });

  // On blur we release the hold state (modifier keyup events are lost when
  // the window loses focus) but do not deactivate if already active, since
  // the user may alt-tab back.
  eventListenerManager.addWindowListener("blur", () => {
    cancelActiveDrag();
    if (isHoldingKeys()) {
      activationHold.clearTimer();
      actions.releaseHold();
      activationHold.resetCopyConfirmation();
    }
    // Modifier keyup events are lost on blur, so a shift release that would
    // have committed the multi-selection never fires. Clear the flag here
    // so the pointermove unfreeze guard and the arrow navigation guard
    // don't stay blocked indefinitely. Frozen elements are intentionally
    // preserved so the user can resume on refocus.
    stopShiftMultiSelecting();
  });

  eventListenerManager.addWindowListener("focus", () => {
    setLastWindowFocusTimestamp(Date.now());
  });

  eventListenerManager.addWindowListener(
    "focusin",
    (event: FocusEvent) => {
      if (isEventFromOverlay(event, "data-react-grab")) {
        event.stopPropagation();
      }
    },
    { capture: true },
  );
};
