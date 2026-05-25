import { type Accessor, createEffect, on } from "solid-js";
import { resolveSource } from "./context.js";
import type { createGrabStore } from "./store.js";

type GrabActions = ReturnType<typeof createGrabStore>["actions"];

interface SelectionSourceSyncInput {
  targetElement: Accessor<Element | null>;
  setSelectionSource: GrabActions["setSelectionSource"];
}

/**
 * Watches the currently-targeted element and resolves its source (file path
 * + line number) through bippy's `resolveSource`, then pushes the result into
 * the grab store via `actions.setSelectionSource`.
 *
 * Uses a request-version counter so an in-flight resolution that arrives
 * after the user moved on to a different element is discarded instead of
 * stomping on the live source.
 */
export const createSelectionSourceSync = (input: SelectionSourceSyncInput): void => {
  const { targetElement, setSelectionSource } = input;
  let requestVersion = 0;

  createEffect(
    on(targetElement, (element) => {
      const currentVersion = ++requestVersion;

      const clearSource = () => {
        if (requestVersion === currentVersion) {
          setSelectionSource(null, null);
        }
      };

      if (!element) {
        clearSource();
        return;
      }

      resolveSource(element)
        .then((source) => {
          if (requestVersion !== currentVersion) return;
          if (!source) {
            clearSource();
            return;
          }
          setSelectionSource(source.filePath, source.lineNumber);
        })
        .catch(clearSource);
    }),
  );
};
