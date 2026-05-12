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
  "AppRouter",
  "AppRouterAnnouncer",
  "AppDevOverlay",
  "AppDevOverlayErrorBoundary",
  "ClientPageRoot",
  "ClientSegmentRoot",
  "DevRootHTTPAccessFallbackBoundary",
  "ErrorBoundary",
  "ErrorBoundaryHandler",
  "GracefulDegradeBoundary",
  "HTTPAccessErrorFallback",
  "HTTPAccessFallbackBoundary",
  "HTTPAccessFallbackErrorBoundary",
  "HandleRedirect",
  "Head",
  "HistoryUpdater",
  "HotReload",
  "InnerLayoutRouter",
  "InnerScrollAndFocusHandler",
  "InnerScrollAndFocusHandlerOld",
  "InnerScrollAndMaybeFocusHandler",
  "InnerScrollHandlerNew",
  "LoadableComponent",
  "LoadingBoundary",
  "LoadingBoundaryProvider",
  "NotAllowedRootHTTPFallbackError",
  "OfflineProvider",
  "OuterLayoutRouter",
  "RedirectBoundary",
  "RedirectErrorBoundary",
  "RenderFromTemplateContext",
  "RenderValidationBoundaryAtThisLevel",
  "ReplaySsrOnlyErrors",
  "RootErrorBoundary",
  "RootLevelDevOverlayElement",
  "Router",
  "ScrollAndFocusHandler",
  "ScrollAndMaybeFocusHandler",
  "SegmentBoundaryTrigger",
  "SegmentBoundaryTriggerNode",
  "SegmentStateProvider",
  "SegmentTrieNode",
  "SegmentViewNode",
  "SegmentViewStateNode",
  "ServerRoot",
  "body",
  "html",
]);

const REACT_INTERNAL_COMPONENT_NAMES = new Set([
  "Suspense",
  "Fragment",
  "StrictMode",
  "Profiler",
  "SuspenseList",
]);

const LIBRARY_INTERNAL_COMPONENT_NAMES = new Set([
  "MotionDOMComponent",
]);

export const isInternalComponentName = (name: string): boolean => {
  if (NEXT_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  if (REACT_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  if (LIBRARY_INTERNAL_COMPONENT_NAMES.has(name)) return true;
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
