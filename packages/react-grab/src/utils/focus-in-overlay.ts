import { IS_DEMO } from "./runtime-mode.js";

// React Grab's demo build is display-only and must never pull focus away from
// the host page. Overlay inputs route their focus through here so demo builds
// skip it - the showcase is driven by synthetic events that don't need real
// focus - while library builds focus as usual.
export const focusInOverlay = (
  element: HTMLElement | null | undefined,
  options?: FocusOptions,
): void => {
  if (IS_DEMO || !element) return;
  element.focus(options);
};
