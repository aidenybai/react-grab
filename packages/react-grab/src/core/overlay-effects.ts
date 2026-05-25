import { type Accessor, createEffect, on, onCleanup } from "solid-js";
import { BOUNDS_RECALC_INTERVAL_MS } from "../constants.js";
import { freezeAnimations } from "../utils/freeze-animations.js";
import { freezeUpdates } from "../utils/freeze-updates.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import type { createGrabStore } from "./store.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

interface OverlayEffectsInput {
  grab: GrabStoreHandle;
  isActivated: Accessor<boolean>;
  /** Whether the user has opted into pausing React state updates during grab. */
  shouldFreezeReactUpdates: Accessor<boolean>;
}

/**
 * Three small effects that gate the overlay's external side effects:
 *
 * 1. While there is a detectedElement, poll BOUNDS_RECALC_INTERVAL_MS ms
 *    to clear it if the DOM removes the node.
 * 2. While there are frozen elements, freeze their WAAPI animations.
 * 3. While the overlay is activated and the user opted into freezeReactUpdates,
 *    pause React state updates via the bippy dispatcher patch.
 *
 * Each effect owns its own cleanup; the factory wires them into the
 * currently-active Solid root so they tear down when init() disposes.
 */
export const createOverlayEffects = (input: OverlayEffectsInput): void => {
  const { grab, isActivated, shouldFreezeReactUpdates } = input;
  const { store, actions } = grab;

  createEffect(() => {
    const element = store.detectedElement;
    if (!element) return;

    const intervalId = setInterval(() => {
      if (!isElementConnected(element)) {
        actions.setDetectedElement(null);
      }
    }, BOUNDS_RECALC_INTERVAL_MS);

    onCleanup(() => clearInterval(intervalId));
  });

  createEffect(() => {
    const elements = store.frozenElements;
    const cleanup = freezeAnimations(elements);
    onCleanup(cleanup);
  });

  createEffect(
    on(isActivated, (activated) => {
      if (!activated) return;
      if (!shouldFreezeReactUpdates()) return;
      const unfreeze = freezeUpdates();
      onCleanup(unfreeze);
    }),
  );
};
