// Scope and mode for the active React Grab instance, held as a singleton so
// utilities outside the init closure (hit-testing, viewport math, clipboard)
// can read them without threading them through every call.
//
// - Scope container confines React Grab to one element instead of the whole
//   page: hit-testing is filtered to the container's subtree, the toolbar
//   treats the container's box as its viewport, and the host page is never
//   frozen. It is a live DOM element so it must be set at runtime.
// - Demo mode is a display-only showcase decided at BUILD time via
//   `process.env.IS_DEMO`, so every demo-only branch is dead-code-eliminated
//   from normal builds. Real user input is ignored and the clipboard is never
//   written; the showcase is driven programmatically via synthetic events. The
//   `react-grab/demo` entrypoint sets the scope container before init so the
//   display-only overlay stays confined to its card.
//
// Scope is a single shared slot, and React Grab mounts a single shadow host, so
// only one scoped/demo instance can be active at a time (createGrabDemo enforces
// this).

let scopeContainer: HTMLElement | null = null;

export const setScopeContainer = (container: HTMLElement | null): void => {
  scopeContainer = container;
};

export const getScopeContainer = (): HTMLElement | null => scopeContainer;

export const isWithinScope = (element: Element | null): boolean => {
  if (!scopeContainer) return true;
  return element !== null && scopeContainer.contains(element);
};

// A build-time constant, not a function: the bundler replaces
// `process.env.IS_DEMO`, folds the comparison, and then constant-propagates
// `IS_DEMO` so every `if (IS_DEMO)` branch is dead-code-eliminated from normal
// builds. A `() => ...` function call would not be inlined across modules.
export const IS_DEMO: boolean = process.env.IS_DEMO === "true";

// The attribute marking React Grab's shadow host. The demo build uses a
// distinct host so it never collides with (or reuses the shadow root of) a
// normal React Grab instance auto-mounted on the same page. Folds to the plain
// `data-react-grab` in library builds, so their behavior is unchanged.
export const REACT_GRAB_HOST_ATTRIBUTE = IS_DEMO ? "data-react-grab-demo" : "data-react-grab";
