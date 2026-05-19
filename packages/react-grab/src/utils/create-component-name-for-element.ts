import { createEffect, createSignal, on } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { getComponentDisplayName, getNearestComponentName } from "../core/context.js";

// Seeds the result synchronously with `getComponentDisplayName` so consumers
// (e.g. the selection label and context menu tag badges) render the component
// name immediately, then upgrades to the nearest user-defined source-component
// name once the async stack walk in `getNearestComponentName` settles. A
// monotonically increasing request version guards against late responses from a
// previous source overwriting the current one.
export const createComponentNameForElement = (
  source: Accessor<Element | null>,
): [Accessor<string | undefined>, Setter<string | undefined>] => {
  const [componentName, setComponentName] = createSignal<string | undefined>(undefined);
  let requestVersion = 0;

  createEffect(
    on(source, (element) => {
      const currentVersion = ++requestVersion;

      if (!element) {
        setComponentName(undefined);
        return;
      }

      const fallbackComponentName = getComponentDisplayName(element) ?? undefined;
      setComponentName(fallbackComponentName);

      getNearestComponentName(element)
        .then((name) => {
          if (requestVersion !== currentVersion) return;
          setComponentName(name ?? fallbackComponentName);
        })
        .catch(() => {
          if (requestVersion !== currentVersion) return;
          setComponentName(fallbackComponentName);
        });
    }),
  );

  return [componentName, setComponentName];
};
