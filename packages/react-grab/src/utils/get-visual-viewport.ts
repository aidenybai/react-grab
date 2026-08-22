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
// hover-and-scroll session. The cache is mutated in place and reused, so callers
// must read the fields immediately rather than retain the object.
const cachedViewport: VisualViewportInfo = {
  width: 0,
  height: 0,
  offsetLeft: 0,
  offsetTop: 0,
};
let cacheTimestamp = Number.NEGATIVE_INFINITY;

export const invalidateVisualViewportCache = (): void => {
  cacheTimestamp = Number.NEGATIVE_INFINITY;
};

export const getVisualViewport = (): VisualViewportInfo => {
  const now = performance.now();
  if (now - cacheTimestamp < VISUAL_VIEWPORT_CACHE_TTL_MS) return cachedViewport;
  cacheTimestamp = now;

  const scopeContainer = getScopeContainer();
  if (scopeContainer) {
    const rect = scopeContainer.getBoundingClientRect();
    cachedViewport.width = rect.width;
    cachedViewport.height = rect.height;
    cachedViewport.offsetLeft = rect.left;
    cachedViewport.offsetTop = rect.top;
    return cachedViewport;
  }

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    cachedViewport.width = visualViewport.width;
    cachedViewport.height = visualViewport.height;
    cachedViewport.offsetLeft = visualViewport.offsetLeft;
    cachedViewport.offsetTop = visualViewport.offsetTop;
    return cachedViewport;
  }

  cachedViewport.width = window.innerWidth;
  cachedViewport.height = window.innerHeight;
  cachedViewport.offsetLeft = 0;
  cachedViewport.offsetTop = 0;
  return cachedViewport;
};
