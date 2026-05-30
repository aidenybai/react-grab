import { type Accessor, createEffect, createSignal, on, onCleanup } from "solid-js";
import { COMPONENT_NAME_DEBOUNCE_MS } from "../constants.js";
import { createComponentNameForElement } from "../utils/create-component-name-for-element.js";

export interface DebouncedComponentName {
  /** Currently-resolved component name (null while debouncing/unresolved). */
  resolved: Accessor<string | undefined>;
  /** Override the resolved value manually (e.g. when toggling shift-multi-select). */
  setResolved: (name: string | undefined) => void;
}

/**
 * Resolves the React component name for the currently-hovered element with a
 * COMPONENT_NAME_DEBOUNCE_MS debounce on the source element, so a bippy fiber
 * traversal does not fire on every pointer-move.
 */
export const createDebouncedComponentName = (
  effectiveElement: Accessor<Element | null>,
): DebouncedComponentName => {
  let debounceTimerId: number | null = null;
  const [debouncedElement, setDebouncedElement] = createSignal<Element | null>(null);
  const [resolved, setResolved] = createComponentNameForElement(debouncedElement);

  createEffect(
    on(effectiveElement, (element) => {
      if (debounceTimerId !== null) {
        clearTimeout(debounceTimerId);
        debounceTimerId = null;
      }

      if (!element) {
        setDebouncedElement(null);
        return;
      }

      debounceTimerId = window.setTimeout(() => {
        debounceTimerId = null;
        setDebouncedElement(element);
      }, COMPONENT_NAME_DEBOUNCE_MS);
    }),
  );

  onCleanup(() => {
    if (debounceTimerId !== null) {
      clearTimeout(debounceTimerId);
      debounceTimerId = null;
    }
  });

  return { resolved, setResolved };
};
