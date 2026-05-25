import { type Accessor, createEffect, on } from "solid-js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabPhaseSelectors } from "./selectors.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface LifecycleHookEffectsInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  targetElement: Accessor<Element | null>;
}

/**
 * Registers the two small plugin-hook-bridging effects that the rest of
 * init() consumes:
 *
 *  - `onActivate` fires when the hold-keys signal transitions
 *    holding -> released while we are still active (i.e. a hold gesture
 *    that committed). Also flips `wasActivatedByToggle` so subsequent
 *    keyup release doesn't fire a deactivation.
 *
 *  - `onElementHover` fires whenever the resolved target element changes.
 *    Also clears the stale `lastGrabbedElement` reference when the user
 *    moves off of the most recently grabbed element.
 */
export const registerLifecycleHookEffects = (input: LifecycleHookEffectsInput): void => {
  const { grab, pluginRegistry, phase, targetElement } = input;
  const { store, actions } = grab;
  const { isActivated, isHoldingKeys } = phase;

  createEffect(
    on(isHoldingKeys, (currentlyHolding, previouslyHolding = false) => {
      if (!previouslyHolding || currentlyHolding || !isActivated()) {
        return;
      }
      if (pluginRegistry.store.options.activationMode !== "hold") {
        actions.setWasActivatedByToggle(true);
      }
      pluginRegistry.hooks.onActivate();
    }),
  );

  createEffect(
    on(
      () => [targetElement(), store.lastGrabbedElement] as const,
      ([currentElement, lastElement]) => {
        if (lastElement && currentElement && lastElement !== currentElement) {
          actions.setLastGrabbed(null);
        }
        if (currentElement) {
          pluginRegistry.hooks.onElementHover(currentElement);
        }
      },
    ),
  );
};
