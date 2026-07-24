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
import { freezeRegisteredRenderers, unfreezeRegisteredRenderers } from "./freeze-renderers.js";
import { throwCollectedErrors } from "./throw-collected-errors.js";

const unfreezeInteractionLayers = (): unknown[] => {
  const cleanupErrors: unknown[] = [];
  try {
    unfreezeRegisteredRenderers();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    unfreezePseudoStates();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    unfreezeGlobalAnimations();
  } catch (error) {
    cleanupErrors.push(error);
  }
  return cleanupErrors;
};

// Batches every layout read (elementFromPoint, getComputedStyle,
// document.getAnimations) ahead of every freeze write. Interleaving them makes
// the injected freeze styles invalidate the tree between reads, forcing a
// second full-document recalc (profiled at ~59ms on a large app).
export const freezeGlobalInteractions = (cursorX?: number, cursorY?: number): void => {
  const pseudoSnapshot = collectPseudoStates(cursorX, cursorY);
  const animationsToFreeze = collectGlobalAnimationsToFreeze();
  try {
    applyPseudoStates(pseudoSnapshot);
    applyGlobalAnimationFreeze(animationsToFreeze);
    freezeRegisteredRenderers();
  } catch (error) {
    const rollbackErrors = unfreezeInteractionLayers();
    if (rollbackErrors.length === 0) throw error;
    throw new AggregateError([error, ...rollbackErrors], "Freezing global interactions failed");
  }
};

export const unfreezeGlobalInteractions = (): void => {
  const cleanupErrors = unfreezeInteractionLayers();
  throwCollectedErrors(cleanupErrors, "Unfreezing global interactions failed");
};
