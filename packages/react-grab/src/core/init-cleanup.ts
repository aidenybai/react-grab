import { unfreezeGlobalAnimations } from "../utils/freeze-animations.js";
import { unfreezePseudoStates } from "../utils/freeze-pseudo-states.js";
import type { CopyFeedbackCooldown } from "./copy-feedback-cooldown.js";
import type { CursorOverride } from "./cursor-override.js";
import type { DragPreviewDebounce } from "./drag-preview-debounce.js";
import type { EnterBlocker } from "./enter-blocker.js";
import type { EventListenerManagerHandle } from "./events.js";
import type { KeydownSpamTimer } from "./keydown-spam-timer.js";
import type { LabelInstanceManager } from "./label-instance-manager.js";
import type { ToolbarMenuController } from "./toolbar-menu-controller.js";


interface InitCleanupInput {
  eventListenerManager: EventListenerManagerHandle;
  dragPreviewDebounce: DragPreviewDebounce;
  keydownSpamTimer: KeydownSpamTimer;
  copyFeedbackCooldown: CopyFeedbackCooldown;
  toolbarMenu: ToolbarMenuController;
  labelManager: LabelInstanceManager;
  cursorOverride: CursorOverride;
  enterBlocker: EnterBlocker;
  autoScroller: { stop: () => void };
}

/**
 * The unified cleanup callback registered via Solid's `onCleanup`. Disposes
 * every subsystem that owns disposable state (event listeners, debounces,
 * timers, observers, label state, cursor override, Enter-blocker DOM
 * patches) and resets `document.body` mutations made during the overlay's
 * lifetime.
 */
export const createInitCleanup = (input: InitCleanupInput): (() => void) => {
  const {
    eventListenerManager,
    dragPreviewDebounce,
    keydownSpamTimer,
    copyFeedbackCooldown,
    toolbarMenu,
    labelManager,
    cursorOverride,
    enterBlocker,
    autoScroller,
  } = input;
  return () => {
    eventListenerManager.abort();
    dragPreviewDebounce.cancel();
    keydownSpamTimer.dispose();
    copyFeedbackCooldown.clear();
    toolbarMenu.dispose();
    labelManager.dispose();
    autoScroller.stop();
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    cursorOverride.clear();
    enterBlocker.restore();
    // If the overlay was active when api.dispose() ran, the activation
    // freeze effects (pseudo-state + WAAPI animation pause) would otherwise
    // leak onto the host page. Both unfreeze fns are safe to call when not
    // frozen — they early-return.
    unfreezePseudoStates();
    unfreezeGlobalAnimations();
  };
};
