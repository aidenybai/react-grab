import { convertParentPositionToIframe } from "./convert-parent-position-to-iframe.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isIframeElement } from "./is-iframe-element.js";

const getDeepElementInDocumentAtPoint = (
  targetDocument: Document,
  clientX: number,
  clientY: number,
): Element | null => {
  let targetElement = targetDocument.elementFromPoint(clientX, clientY);

  while (targetElement) {
    const shadowTargetElement = targetElement.shadowRoot?.elementFromPoint(clientX, clientY);
    if (shadowTargetElement && shadowTargetElement !== targetElement) {
      targetElement = shadowTargetElement;
      continue;
    }

    if (isIframeElement(targetElement)) {
      const iframeDocument = getAccessibleIframeDocument(targetElement);
      if (!iframeDocument) return targetElement;
      const iframePosition = convertParentPositionToIframe(targetElement, clientX, clientY);
      return (
        getDeepElementInDocumentAtPoint(iframeDocument, iframePosition.x, iframePosition.y) ??
        targetElement
      );
    }

    return targetElement;
  }

  return null;
};

export const getDeepElementAtPoint = (clientX: number, clientY: number): Element | null =>
  getDeepElementInDocumentAtPoint(document, clientX, clientY);
