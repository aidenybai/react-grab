interface DocumentEpochs {
  epoch: number;
  styleEpoch: number;
}

const trackerByDocument = new WeakMap<Document, () => DocumentEpochs>();

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

const isStyleSourceNode = (node: Node): boolean => {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const localName = (node as Element).localName;
  return localName === "style" || localName === "link";
};

const touchesStyleSource = (record: MutationRecord): boolean => {
  let currentNode: Node | null = record.target;
  while (currentNode !== null) {
    if (isStyleSourceNode(currentNode)) return true;
    currentNode = currentNode.parentNode;
  }
  if (record.type === "childList") {
    for (const addedNode of record.addedNodes) {
      if (isStyleSourceNode(addedNode)) return true;
    }
    for (const removedNode of record.removedNodes) {
      if (isStyleSourceNode(removedNode)) return true;
    }
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
const createDocumentEpochReader = (sourceDocument: Document): (() => DocumentEpochs) => {
  const epochs: DocumentEpochs = { epoch: 0, styleEpoch: 0 };
  const bumpEpoch = (): void => {
    epochs.epoch++;
  };
  const bumpEpochFromEvent = (event: Event): void => {
    if (event.target instanceof Node && isEpochIgnoredNode(event.target)) return;
    epochs.epoch++;
  };
  const applyMutationRecords = (records: MutationRecord[]): void => {
    if (records.some(isObservableMutationRecord)) epochs.epoch++;
    if (records.some(touchesStyleSource)) epochs.styleEpoch++;
  };
  const mutationObserver = new MutationObserver(applyMutationRecords);
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
    applyMutationRecords(mutationObserver.takeRecords());
    return epochs;
  };
};

const readDocumentEpochs = (sourceDocument: Document): DocumentEpochs => {
  let readEpochs = trackerByDocument.get(sourceDocument);
  if (readEpochs === undefined) {
    readEpochs = createDocumentEpochReader(sourceDocument);
    trackerByDocument.set(sourceDocument, readEpochs);
  }
  return readEpochs();
};

export const getDocumentEpoch = (sourceDocument: Document): number =>
  readDocumentEpochs(sourceDocument).epoch;

export const getDocumentStyleEpoch = (sourceDocument: Document): number =>
  readDocumentEpochs(sourceDocument).styleEpoch;
