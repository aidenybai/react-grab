import { FEEDBACK_DURATION_MS } from "../constants.js";

export interface CopyFeedbackCooldown {
  /** True while the post-copy cooldown window is active. */
  isActive: () => boolean;
  /** Begin the cooldown; cancels any prior pending clear. */
  start: () => void;
  /** Immediately end the cooldown and cancel any pending timer. */
  clear: () => void;
}

/**
 * Tracks the short window immediately after a copy during which a modifier
 * release should fully deactivate the overlay (instead of letting it bounce
 * back to "active" via the post-copy state machine). The cooldown auto-clears
 * after FEEDBACK_DURATION_MS.
 */
export const createCopyFeedbackCooldown = (): CopyFeedbackCooldown => {
  let isActive = false;
  let timerId: number | null = null;

  const clear = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    isActive = false;
  };

  const start = () => {
    isActive = true;
    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
    timerId = window.setTimeout(() => {
      isActive = false;
      timerId = null;
    }, FEEDBACK_DURATION_MS);
  };

  return {
    isActive: () => isActive,
    start,
    clear,
  };
};
