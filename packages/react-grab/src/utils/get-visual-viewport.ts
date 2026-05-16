interface VisualViewportInfo {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

// PERF: a single mutable singleton is returned to every caller so V8 keeps a
// monomorphic hidden class at consumer read sites (e.g. the toolbar position
// helpers inline this and bail out with `dependent field type constness
// changed` if the returned object's shape transitions). Callers must consume
// the result synchronously - never hold the reference across another
// getVisualViewport() call.
const viewportCache: VisualViewportInfo = {
  width: 0,
  height: 0,
  offsetLeft: 0,
  offsetTop: 0,
};

export const getVisualViewport = (): VisualViewportInfo => {
  const visualViewport = window.visualViewport;
  if (visualViewport) {
    viewportCache.width = visualViewport.width;
    viewportCache.height = visualViewport.height;
    viewportCache.offsetLeft = visualViewport.offsetLeft;
    viewportCache.offsetTop = visualViewport.offsetTop;
  } else {
    viewportCache.width = window.innerWidth;
    viewportCache.height = window.innerHeight;
    viewportCache.offsetLeft = 0;
    viewportCache.offsetTop = 0;
  }
  return viewportCache;
};
