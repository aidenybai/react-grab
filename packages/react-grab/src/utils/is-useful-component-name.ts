const NON_COMPONENT_PREFIXES = new Set([
  "_",
  "$",
  "motion.",
  "styled.",
  "chakra.",
  "ark.",
  "Primitive.",
  "Slot.",
]);

const NEXT_INTERNAL_COMPONENT_NAMES = new Set([
  "InnerLayoutRouter",
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "HTTPAccessFallbackErrorBoundary",
  "HTTPAccessFallbackBoundary",
  "LoadingBoundary",
  "ErrorBoundary",
  "InnerScrollAndFocusHandler",
  "ScrollAndFocusHandler",
  "RenderFromTemplateContext",
  "OuterLayoutRouter",
  "body",
  "html",
  "DevRootHTTPAccessFallbackBoundary",
  "AppDevOverlayErrorBoundary",
  "AppDevOverlay",
  "HotReload",
  "Router",
  "ErrorBoundaryHandler",
  "AppRouter",
  "ServerRoot",
  "SegmentStateProvider",
  "RootErrorBoundary",
  "LoadableComponent",
  "MotionDOMComponent",
]);

const REACT_INTERNAL_COMPONENT_NAMES = new Set([
  "Suspense",
  "Fragment",
  "StrictMode",
  "Profiler",
  "SuspenseList",
]);

export const isInternalComponentName = (name: string): boolean => {
  if (NEXT_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  if (REACT_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  for (const prefix of NON_COMPONENT_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
};

export const isUsefulComponentName = (name: string): boolean => {
  if (!name) return false;
  if (isInternalComponentName(name)) return false;
  if (name === "SlotClone" || name === "Slot") return false;
  return true;
};
