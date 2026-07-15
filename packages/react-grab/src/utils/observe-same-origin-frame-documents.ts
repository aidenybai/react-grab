import { SAME_ORIGIN_FRAME_ATTRIBUTE } from "../constants.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isElementNode } from "./is-element-node.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isReactGrabElement } from "./is-react-grab-element.js";

interface FrameDocumentCallback {
  (frameDocument: Document): (() => void) | void;
}

interface ObservedIframe {
  abortController: AbortController;
  document: Document | null;
}

export const observeSameOriginFrameDocuments = (callback: FrameDocumentCallback): (() => void) => {
  const documentCleanups = new Map<Document, (() => void) | void>();
  const shadowRootHookCleanups = new Map<Document, () => void>();
  const rootObservers = new Map<Document | ShadowRoot, MutationObserver>();
  const observedIframes = new Map<HTMLIFrameElement, ObservedIframe>();

  const cleanupDocument = (targetDocument: Document): void => {
    const rootObserver = rootObservers.get(targetDocument);
    if (rootObserver) {
      rootObserver.disconnect();
      rootObservers.delete(targetDocument);
    }

    for (const root of [...rootObservers.keys()]) {
      if ("host" in root && root.ownerDocument === targetDocument) cleanupRoot(root);
    }

    for (const iframeElement of [...observedIframes.keys()]) {
      if (iframeElement.ownerDocument === targetDocument) cleanupIframe(iframeElement);
    }

    shadowRootHookCleanups.get(targetDocument)?.();
    shadowRootHookCleanups.delete(targetDocument);
    documentCleanups.get(targetDocument)?.();
    documentCleanups.delete(targetDocument);
  };

  const cleanupRoot = (root: ShadowRoot): void => {
    const rootObserver = rootObservers.get(root);
    if (!rootObserver) return;
    rootObserver.disconnect();
    rootObservers.delete(root);

    for (const descendantElement of root.querySelectorAll("*")) {
      cleanupElement(descendantElement);
    }
  };

  const cleanupIframe = (iframeElement: HTMLIFrameElement): void => {
    const observedIframe = observedIframes.get(iframeElement);
    if (!observedIframe) return;
    observedIframes.delete(iframeElement);
    observedIframe.abortController.abort();
    iframeElement.removeAttribute(SAME_ORIGIN_FRAME_ATTRIBUTE);
    if (observedIframe.document) cleanupDocument(observedIframe.document);
  };

  const cleanupElement = (element: Element): void => {
    if (isIframeElement(element)) cleanupIframe(element);
    if (element.shadowRoot) cleanupRoot(element.shadowRoot);
  };

  const cleanupSubtree = (element: Element): void => {
    for (const descendantElement of element.querySelectorAll("*")) {
      cleanupElement(descendantElement);
    }
    cleanupElement(element);
  };

  const observeDocument = (targetDocument: Document): void => {
    if (documentCleanups.has(targetDocument)) return;
    documentCleanups.set(targetDocument, callback(targetDocument));
    observeLateShadowRoots(targetDocument);
    observeRoot(targetDocument);
  };

  const observeLateShadowRoots = (targetDocument: Document): void => {
    const elementPrototype = targetDocument.defaultView?.Element.prototype;
    if (!elementPrototype) return;

    const originalAttachShadow = elementPrototype.attachShadow;
    const patchedAttachShadow = new Proxy(originalAttachShadow, {
      apply: (attachShadow, targetElement, argumentList) => {
        const shadowRoot = Reflect.apply(attachShadow, targetElement, argumentList);
        if (
          shadowRoot.mode === "open" &&
          targetElement.isConnected &&
          documentCleanups.has(targetDocument)
        ) {
          observeRoot(shadowRoot);
        }
        return shadowRoot;
      },
    });

    elementPrototype.attachShadow = patchedAttachShadow;
    shadowRootHookCleanups.set(targetDocument, () => {
      if (elementPrototype.attachShadow === patchedAttachShadow) {
        elementPrototype.attachShadow = originalAttachShadow;
      }
    });
  };

  const observeIframe = (iframeElement: HTMLIFrameElement): void => {
    if (observedIframes.has(iframeElement)) return;

    const observedIframe: ObservedIframe = {
      abortController: new AbortController(),
      document: null,
    };
    observedIframes.set(iframeElement, observedIframe);

    const connectCurrentDocument = (): void => {
      const frameDocument = getAccessibleIframeDocument(iframeElement);
      if (observedIframe.document && observedIframe.document !== frameDocument) {
        cleanupDocument(observedIframe.document);
      }
      observedIframe.document = frameDocument;

      if (!frameDocument) {
        iframeElement.removeAttribute(SAME_ORIGIN_FRAME_ATTRIBUTE);
        return;
      }

      iframeElement.setAttribute(SAME_ORIGIN_FRAME_ATTRIBUTE, "");
      observeDocument(frameDocument);
    };

    iframeElement.addEventListener("load", connectCurrentDocument, {
      signal: observedIframe.abortController.signal,
    });
    connectCurrentDocument();
  };

  const observeElement = (element: Element): void => {
    if (isReactGrabElement(element)) return;
    if (isIframeElement(element)) observeIframe(element);
    if (element.shadowRoot) observeRoot(element.shadowRoot);
  };

  const observeSubtree = (element: Element): void => {
    observeElement(element);
    if (isReactGrabElement(element)) return;
    for (const descendantElement of element.querySelectorAll("*")) {
      observeElement(descendantElement);
    }
  };

  const observeRoot = (root: Document | ShadowRoot): void => {
    if (rootObservers.has(root)) return;

    const rootWindow = "defaultView" in root ? root.defaultView : root.ownerDocument.defaultView;
    if (!rootWindow) return;

    const mutationObserver = new rootWindow.MutationObserver((records) => {
      for (const record of records) {
        for (const removedNode of record.removedNodes) {
          if (isElementNode(removedNode)) cleanupSubtree(removedNode);
        }
        for (const addedNode of record.addedNodes) {
          if (isElementNode(addedNode)) observeSubtree(addedNode);
        }
      }
    });
    rootObservers.set(root, mutationObserver);
    mutationObserver.observe(root, { childList: true, subtree: true });

    for (const descendantElement of root.querySelectorAll("*")) {
      observeElement(descendantElement);
    }
  };

  observeDocument(document);

  return () => {
    for (const iframeElement of [...observedIframes.keys()]) {
      cleanupIframe(iframeElement);
    }
    for (const rootObserver of rootObservers.values()) {
      rootObserver.disconnect();
    }
    for (const shadowRootHookCleanup of shadowRootHookCleanups.values()) {
      shadowRootHookCleanup();
    }
    for (const documentCleanup of documentCleanups.values()) {
      documentCleanup?.();
    }
    rootObservers.clear();
    shadowRootHookCleanups.clear();
    documentCleanups.clear();
  };
};
