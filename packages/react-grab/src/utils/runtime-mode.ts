// Scope and mode for the active React Grab instance, held as a singleton so
// utilities outside the init closure (hit-testing, viewport math) can read them
// without threading them through every call.
//
// - Scope container confines React Grab to one element instead of the whole
//   page: hit-testing is filtered to the container's subtree and the toolbar
//   treats the container's box as its viewport. A live DOM element, so set at
//   runtime; init owns its lifecycle (set after the single-init guard, cleared
//   on cleanup).
// - Demo mode is decided at BUILD time via `process.env.IS_DEMO`, so every
//   demo-only branch is dead-code-eliminated from normal builds. It is
//   display-only: real input is ignored and the clipboard/storage are never
//   written; the showcase is driven via synthetic events (the demo build's
//   createGrabDemo, which passes a container to init).
//
// One shared scope slot and one shadow host, so only one demo instance can be
// active at a time (createGrabDemo enforces this).

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
//
// Consumers that bundle this SOURCE directly (rather than dist) must define
// `process.env.IS_DEMO` (e.g. to `""`) — a `typeof process` guard here would
// defeat the define replacement the demo build relies on, so without a define
// the bare `process` access throws in the browser. See apps/openstory/vite.config.ts.
export const IS_DEMO: boolean = process.env.IS_DEMO === "true";
