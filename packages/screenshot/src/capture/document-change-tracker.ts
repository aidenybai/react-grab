const trackerByDocument = new WeakMap<Document, () => number>();

// A monotonically increasing counter that changes whenever anything observable
// about the document that could affect rendering happens: DOM mutations,
// scrolling, user input, resource loads, resizes, font loads, or :target
// changes. Mutations inside shadow roots are NOT observed; callers must keep
// shadow-hosting trees out of epoch-keyed caches.
const createDocumentEpochReader = (sourceDocument: Document): (() => number) => {
  let epoch = 0;
  const bumpEpoch = (): void => {
    epoch++;
  };
  const mutationObserver = new MutationObserver(bumpEpoch);
  mutationObserver.observe(sourceDocument.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };
  for (const eventType of ["scroll", "input", "change", "load", "error", "toggle"]) {
    sourceDocument.addEventListener(eventType, bumpEpoch, listenerOptions);
  }
  const defaultView = sourceDocument.defaultView;
  if (defaultView) {
    for (const eventType of ["resize", "hashchange", "popstate"]) {
      defaultView.addEventListener(eventType, bumpEpoch, listenerOptions);
    }
  }
  sourceDocument.fonts.addEventListener("loadingdone", bumpEpoch);
  return () => {
    if (mutationObserver.takeRecords().length > 0) epoch++;
    return epoch;
  };
};

export const getDocumentEpoch = (sourceDocument: Document): number => {
  let readEpoch = trackerByDocument.get(sourceDocument);
  if (readEpoch === undefined) {
    readEpoch = createDocumentEpochReader(sourceDocument);
    trackerByDocument.set(sourceDocument, readEpoch);
  }
  return readEpoch();
};
