// The mode the active React Grab instance is running in. Held as a singleton so
// utilities outside the init closure (hit-testing, viewport math, clipboard) can
// read it without threading it through every call.
//
// - container: confines React Grab to one element instead of the whole page.
// - demo: display-only showcase; real user input is ignored and the clipboard
//   is never written (driven programmatically via synthetic events).

interface RuntimeMode {
  container: HTMLElement | null;
  demo: boolean;
}

const runtime: RuntimeMode = { container: null, demo: false };

export const setRuntimeMode = (container: HTMLElement | null, demo: boolean): void => {
  runtime.container = container;
  runtime.demo = demo;
};

export const getScopeContainer = (): HTMLElement | null => runtime.container;

export const isWithinScope = (element: Element | null): boolean => {
  if (!runtime.container) return true;
  return element !== null && runtime.container.contains(element);
};

export const isDemoMode = (): boolean => runtime.demo;
