import { SAME_ORIGIN_FRAME_ATTRIBUTE } from "../constants.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isElementNode } from "./is-element-node.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isReactGrabElement } from "./is-react-grab-element.js";
import { throwCollectedErrors } from "./throw-collected-errors.js";

interface FrameDocumentCallback {
  (frameDocument: Document): (() => void) | void;
}

interface ObservedIframe {
  abortController: AbortController;
  document: Document | null;
}

const collectCleanupError = (cleanup: () => void, cleanupErrors: unknown[]): void => {
  try {
    cleanup();
  } catch (error) {
    cleanupErrors.push(error);
  }
};

export const observeSameOriginFrameDocuments = (callback: FrameDocumentCallback): (() => void) => {
  const documentCleanups = new Map<Document, (() => void) | void>();
  const shadowRootHookCleanups = new Map<Document, () => void>();
  const rootObservers = new Map<Document | ShadowRoot, MutationObserver>();
  const observedIframes = new Map<HTMLIFrameElement, ObservedIframe>();

  const cleanupDocument = (targetDocument: Document, cleanupErrors: unknown[]): void => {
    const rootObserver = rootObservers.get(targetDocument);
    if (rootObserver) {
      rootObservers.delete(targetDocument);
      collectCleanupError(() => rootObserver.disconnect(), cleanupErrors);
    }

    for (const root of [...rootObservers.keys()]) {
      if ("host" in root && root.ownerDocument === targetDocument) cleanupRoot(root, cleanupErrors);
    }

    for (const iframeElement of [...observedIframes.keys()]) {
      if (iframeElement.ownerDocument === targetDocument)
        cleanupIframe(iframeElement, cleanupErrors);
    }

    const shadowRootHookCleanup = shadowRootHookCleanups.get(targetDocument);
    shadowRootHookCleanups.delete(targetDocument);
    if (shadowRootHookCleanup) collectCleanupError(shadowRootHookCleanup, cleanupErrors);

    const documentCleanup = documentCleanups.get(targetDocument);
    documentCleanups.delete(targetDocument);
    if (documentCleanup) collectCleanupError(documentCleanup, cleanupErrors);
  };

  const cleanupRoot = (root: ShadowRoot, cleanupErrors: unknown[]): void => {
    const rootObserver = rootObservers.get(root);
    if (!rootObserver) return;
    rootObservers.delete(root);
    collectCleanupError(() => rootObserver.disconnect(), cleanupErrors);

    for (const descendantElement of root.querySelectorAll("*")) {
      cleanupElement(descendantElement, cleanupErrors);
    }
  };

  const cleanupIframe = (iframeElement: HTMLIFrameElement, cleanupErrors: unknown[]): void => {
    const observedIframe = observedIframes.get(iframeElement);
    if (!observedIframe) return;
    observedIframes.delete(iframeElement);
    collectCleanupError(() => observedIframe.abortController.abort(), cleanupErrors);
    collectCleanupError(
      () => iframeElement.removeAttribute(SAME_ORIGIN_FRAME_ATTRIBUTE),
      cleanupErrors,
    );
    if (observedIframe.document) cleanupDocument(observedIframe.document, cleanupErrors);
  };

  const cleanupElement = (element: Element, cleanupErrors: unknown[]): void => {
    if (isIframeElement(element)) cleanupIframe(element, cleanupErrors);
    if (element.shadowRoot) cleanupRoot(element.shadowRoot, cleanupErrors);
  };

  const cleanupSubtree = (element: Element, cleanupErrors: unknown[]): void => {
    for (const descendantElement of element.querySelectorAll("*")) {
      cleanupElement(descendantElement, cleanupErrors);
    }
    cleanupElement(element, cleanupErrors);
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
      const cleanupErrors: unknown[] = [];
      const frameDocument = getAccessibleIframeDocument(iframeElement);
      if (observedIframe.document && observedIframe.document !== frameDocument) {
        cleanupDocument(observedIframe.document, cleanupErrors);
      }
      observedIframe.document = frameDocument;

      if (!frameDocument) {
        iframeElement.removeAttribute(SAME_ORIGIN_FRAME_ATTRIBUTE);
        throwCollectedErrors(cleanupErrors, "Cleaning up replaced frame document failed");
        return;
      }

      iframeElement.setAttribute(SAME_ORIGIN_FRAME_ATTRIBUTE, "");
      observeDocument(frameDocument);
      throwCollectedErrors(cleanupErrors, "Cleaning up replaced frame document failed");
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
      const cleanupErrors: unknown[] = [];
      for (const record of records) {
        for (const removedNode of record.removedNodes) {
          if (isElementNode(removedNode)) cleanupSubtree(removedNode, cleanupErrors);
        }
        for (const addedNode of record.addedNodes) {
          if (isElementNode(addedNode)) observeSubtree(addedNode);
        }
      }
      throwCollectedErrors(cleanupErrors, "Cleaning up removed frame documents failed");
    });
    rootObservers.set(root, mutationObserver);
    mutationObserver.observe(root, { childList: true, subtree: true });

    for (const descendantElement of root.querySelectorAll("*")) {
      observeElement(descendantElement);
    }
  };

  observeDocument(document);

  return () => {
    const cleanupErrors: unknown[] = [];
    for (const iframeElement of [...observedIframes.keys()]) {
      cleanupIframe(iframeElement, cleanupErrors);
    }
    for (const [root, rootObserver] of rootObservers) {
      rootObservers.delete(root);
      collectCleanupError(() => rootObserver.disconnect(), cleanupErrors);
    }
    for (const [targetDocument, shadowRootHookCleanup] of shadowRootHookCleanups) {
      shadowRootHookCleanups.delete(targetDocument);
      collectCleanupError(shadowRootHookCleanup, cleanupErrors);
    }
    for (const [targetDocument, documentCleanup] of documentCleanups) {
      documentCleanups.delete(targetDocument);
      if (documentCleanup) collectCleanupError(documentCleanup, cleanupErrors);
    }
    throwCollectedErrors(cleanupErrors, "Cleaning up same-origin frame documents failed");
  };
};
