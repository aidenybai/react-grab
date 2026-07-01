import {
  applyGlobalAnimationFreeze,
  collectGlobalAnimationsToFreeze,
  unfreezeGlobalAnimations,
} from "./freeze-animations.js";
import {
  applyPseudoStates,
  collectPseudoStates,
  unfreezePseudoStates,
} from "./freeze-pseudo-states.js";

// Batches every layout read (elementFromPoint, getComputedStyle,
// document.getAnimations) ahead of every freeze write. Interleaving them makes
// the injected freeze styles invalidate the tree between reads, forcing a
// second full-document recalc (profiled at ~59ms on a large app).
export const freezeGlobalInteractions = (cursorX?: number, cursorY?: number): void => {
  const pseudoSnapshot = collectPseudoStates(cursorX, cursorY);
  const animationsToFreeze = collectGlobalAnimationsToFreeze();
  applyPseudoStates(pseudoSnapshot);
  applyGlobalAnimationFreeze(animationsToFreeze);
};

export const unfreezeGlobalInteractions = (): void => {
  unfreezePseudoStates();
  unfreezeGlobalAnimations();
};
