interface EventListenerManager {
  signal: AbortSignal;
  abort: () => void;
  addWindowListener: <K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: Omit<AddEventListenerOptions, "signal">,
  ) => void;
  addDocumentListener: <K extends keyof DocumentEventMap>(
    type: K,
    listener: (event: DocumentEventMap[K]) => void,
    options?: Omit<AddEventListenerOptions, "signal">,
  ) => void;
}

export const createEventListenerManager = (): EventListenerManager => {
  const abortController = new AbortController();

  const addWindowListener: EventListenerManager["addWindowListener"] = (
    type,
    listener,
    options = {},
  ) => {
    window.addEventListener(type, listener, {
      ...options,
      signal: abortController.signal,
    });
  };

  const addDocumentListener: EventListenerManager["addDocumentListener"] = (
    type,
    listener,
    options = {},
  ) => {
    document.addEventListener(type, listener, {
      ...options,
      signal: abortController.signal,
    });
  };

  return {
    signal: abortController.signal,
    abort: () => abortController.abort(),
    addWindowListener,
    addDocumentListener,
  };
};
