import { isElementConnected } from "../utils/is-element-connected.js";
import type { createAutoScroller } from "./auto-scroll.js";
import type { CopyFeedbackCooldown } from "./copy-feedback-cooldown.js";
import type { GrabStoreHandle } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabPhaseSelectors } from "./selectors.js";

type PluginRegistry = ReturnType<typeof createPluginRegistry>;
type AutoScroller = ReturnType<typeof createAutoScroller>;

interface ActivationLifecycleInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  pluginRegistry: PluginRegistry;
  copyFeedbackCooldown: CopyFeedbackCooldown;
  autoScroller: AutoScroller;
  /** Reset arrow-navigation state on deactivate. */
  clearArrowNavigation: () => void;
  /** Reset space-drag-repositioning state on deactivate. */
  stopSpaceDragRepositioning: () => void;
  /** Reset shift-multi-select state on deactivate. */
  stopShiftMultiSelecting: () => void;
  /** Reset the shared `keyboardSelectedElement` closure flag. */
  clearKeyboardSelectedElement: () => void;
  /** Cancel the keydown-spam debounce timer if armed. */
  clearKeydownSpamTimer: () => void;
  /** Clear the pending-context-menu-select signal. */
  clearPendingContextMenuSelect: () => void;
}

export interface ActivationLifecycle {
  /** Bring the overlay into the active phase; fires plugin onActivate. */
  activateRenderer: () => void;
  /**
   * Take the overlay back to idle. Tears down every per-activation
   * subsystem: arrow nav, space-drag, shift-multi-select, pending
   * context-menu, keydown-spam, auto-scroll, drag-userSelect override,
   * and the focus-restore-on-deactivate path. Fires plugin onDeactivate.
   */
  deactivateRenderer: () => void;
  /** Belt-and-suspenders: release hold + deactivate if active + clear cooldown. */
  forceDeactivateAll: () => void;
  /** Toggle-style entry that marks wasActivatedByToggle before activating. */
  toggleActivate: () => void;
}

/**
 * Owns the activate/deactivate/forceDeactivate/toggle entry points and the
 * teardown choreography that runs on deactivation. The deactivate path is
 * the single most cross-cutting routine in init(); concentrating it here
 * keeps the dependency surface visible and prevents subsystems from being
 * silently skipped during cleanup.
 */
export const createActivationLifecycle = (
  input: ActivationLifecycleInput,
): ActivationLifecycle => {
  const {
    grab,
    phase,
    pluginRegistry,
    copyFeedbackCooldown,
    autoScroller,
    clearArrowNavigation,
    stopSpaceDragRepositioning,
    stopShiftMultiSelecting,
    clearKeyboardSelectedElement,
    clearKeydownSpamTimer,
    clearPendingContextMenuSelect,
  } = input;
  const { store, actions } = grab;
  const { isHoldingKeys, isActivated, isDragging } = phase;

  const activateRenderer = () => {
    const wasInHoldingState = isHoldingKeys();
    actions.activate();
    if (!wasInHoldingState) {
      pluginRegistry.hooks.onActivate();
    }
  };

  const deactivateRenderer = () => {
    const wasDragging = isDragging();
    const previousFocused = store.previouslyFocusedElement;
    stopSpaceDragRepositioning();
    actions.deactivate();
    stopShiftMultiSelecting();
    clearArrowNavigation();
    clearKeyboardSelectedElement();
    clearPendingContextMenuSelect();
    if (wasDragging) {
      document.body.style.userSelect = "";
    }
    clearKeydownSpamTimer();
    autoScroller.stop();
    // Calling .focus() forces a synchronous focus event dispatch and a style
    // recalc. Skip it when the target is <body> or already the active
    // element — both cases produce no observable focus change but were
    // previously paying the recalc cost on every deactivate.
    if (
      previousFocused instanceof HTMLElement &&
      previousFocused !== document.body &&
      previousFocused !== document.activeElement &&
      isElementConnected(previousFocused)
    ) {
      previousFocused.focus();
    }
    pluginRegistry.hooks.onDeactivate();
  };

  const forceDeactivateAll = () => {
    if (isHoldingKeys()) {
      actions.releaseHold();
    }
    if (isActivated()) {
      deactivateRenderer();
    }
    copyFeedbackCooldown.clear();
  };

  const toggleActivate = () => {
    actions.setWasActivatedByToggle(true);
    activateRenderer();
  };

  return { activateRenderer, deactivateRenderer, forceDeactivateAll, toggleActivate };
};
