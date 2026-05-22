import { createEffect, createSignal, on, type Accessor, type Setter } from "solid-js";
import { getComponentDisplayName, getNearestComponentName } from "../core/context.js";

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
