import { VISUAL_VIEWPORT_CACHE_TTL_MS } from "../constants.js";
import { getScopeContainer } from "./runtime-mode.js";

interface VisualViewportInfo {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

// Reading window.visualViewport (or the scope container's rect) flushes pending
// style and layout, and the toolbar/label position memos call this on every
// pointer move and scroll frame — profiled at ~25ms of self time across a 3s
// hover-and-scroll session. Only the measurement is cached; callers still get
// their own object, so retaining one can never observe a later viewport.
const cachedViewport: VisualViewportInfo = {
  width: 0,
  height: 0,
  offsetLeft: 0,
  offsetTop: 0,
};
let cachedScopeContainer: Element | null = null;
let cacheTimestamp = Number.NEGATIVE_INFINITY;

export const invalidateVisualViewportCache = (): void => {
  cacheTimestamp = Number.NEGATIVE_INFINITY;
};

const measureViewport = (scopeContainer: Element | null): void => {
  if (scopeContainer) {
    const rect = scopeContainer.getBoundingClientRect();
    cachedViewport.width = rect.width;
    cachedViewport.height = rect.height;
    cachedViewport.offsetLeft = rect.left;
    cachedViewport.offsetTop = rect.top;
    return;
  }

  const visualViewport = window.visualViewport;
  cachedViewport.width = visualViewport?.width ?? window.innerWidth;
  cachedViewport.height = visualViewport?.height ?? window.innerHeight;
  cachedViewport.offsetLeft = visualViewport?.offsetLeft ?? 0;
  cachedViewport.offsetTop = visualViewport?.offsetTop ?? 0;
};

export const getVisualViewport = (): VisualViewportInfo => {
  const scopeContainer = getScopeContainer();
  const now = performance.now();
  // Keyed by scope because a dispose and re-init within the TTL would otherwise
  // position against the previous scope's dimensions.
  if (
    scopeContainer !== cachedScopeContainer ||
    now - cacheTimestamp >= VISUAL_VIEWPORT_CACHE_TTL_MS
  ) {
    cachedScopeContainer = scopeContainer;
    cacheTimestamp = now;
    measureViewport(scopeContainer);
  }

  return {
    width: cachedViewport.width,
    height: cachedViewport.height,
    offsetLeft: cachedViewport.offsetLeft,
    offsetTop: cachedViewport.offsetTop,
  };
};
