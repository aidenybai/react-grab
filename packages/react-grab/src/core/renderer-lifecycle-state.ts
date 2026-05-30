export interface RendererLifecycleState {
  /** True after the public `api.dispose()` was called. */
  isDisposed: () => boolean;
  /** Mark the lifecycle as disposed (idempotent). */
  markDisposed: () => void;
  /** The renderer's solid-js/web dispose callback, set after mount. */
  getDisposeRenderer: () => (() => void) | undefined;
  /** Store the renderer's dispose callback for later teardown. */
  setDisposeRenderer: (dispose: () => void) => void;
}

/**
 * Two paired closure values:
 *
 *  - `disposed` — flips to true on api.dispose(); the renderer's async
 *    dynamic-import resolution checks this to no-op if the api was
 *    disposed before the renderer module loaded.
 *
 *  - `disposeRenderer` — the function returned by solid-js/web `render`
 *    after the dynamic import resolves. api.dispose() calls it to tear
 *    down the renderer's reactive root.
 */
export const createRendererLifecycleState = (): RendererLifecycleState => {
  let disposed = false;
  let disposeRenderer: (() => void) | undefined;

  return {
    isDisposed: () => disposed,
    markDisposed: () => {
      disposed = true;
    },
    getDisposeRenderer: () => disposeRenderer,
    setDisposeRenderer: (dispose) => {
      disposeRenderer = dispose;
    },
  };
};
