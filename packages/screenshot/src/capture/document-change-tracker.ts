const trackerByDocument = new WeakMap<Document, () => number>();

// Marks capture-internal document artifacts (e.g. the style sandbox iframe)
// whose mutations and load events must not invalidate epoch-keyed caches.
export const EPOCH_IGNORED_ATTRIBUTE = "data-fhti-epoch-ignored";

const isEpochIgnoredNode = (node: Node | null): boolean => {
  let currentNode: Node | null = node;
  while (currentNode !== null) {
    if (
      currentNode.nodeType === Node.ELEMENT_NODE &&
      (currentNode as Element).hasAttribute(EPOCH_IGNORED_ATTRIBUTE)
    ) {
      return true;
    }
    currentNode = currentNode.parentNode;
  }
  return false;
};

const isObservableMutationRecord = (record: MutationRecord): boolean => {
  if (record.type === "childList") {
    for (const addedNode of record.addedNodes) {
      if (!isEpochIgnoredNode(addedNode)) return true;
    }
    for (const removedNode of record.removedNodes) {
      if (!isEpochIgnoredNode(removedNode)) return true;
    }
    return false;
  }
  return !isEpochIgnoredNode(record.target);
};

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
  const bumpEpochFromEvent = (event: Event): void => {
    if (event.target instanceof Node && isEpochIgnoredNode(event.target)) return;
    epoch++;
  };
  const mutationObserver = new MutationObserver((records) => {
    if (records.some(isObservableMutationRecord)) epoch++;
  });
  mutationObserver.observe(sourceDocument.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };
  for (const eventType of ["scroll", "input", "change", "load", "error", "toggle"]) {
    sourceDocument.addEventListener(eventType, bumpEpochFromEvent, listenerOptions);
  }
  const defaultView = sourceDocument.defaultView;
  if (defaultView) {
    for (const eventType of ["resize", "hashchange", "popstate"]) {
      defaultView.addEventListener(eventType, bumpEpoch, listenerOptions);
    }
  }
  sourceDocument.fonts.addEventListener("loadingdone", bumpEpoch);
  return () => {
    if (mutationObserver.takeRecords().some(isObservableMutationRecord)) epoch++;
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
