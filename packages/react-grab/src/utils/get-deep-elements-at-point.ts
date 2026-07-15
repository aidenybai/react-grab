import { convertParentPositionToIframe } from "./convert-parent-position-to-iframe.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isUserIgnoredElement } from "./is-user-ignored-element.js";

const collectElementsAtPoint = (
  root: Document | ShadowRoot,
  clientX: number,
  clientY: number,
  collectedElements: Set<Element>,
): void => {
  const elements = root.elementsFromPoint(clientX, clientY);
  let canDescendIntoNestedRoots = true;

  for (const element of elements) {
    if (isUserIgnoredElement(element)) canDescendIntoNestedRoots = false;

    if (canDescendIntoNestedRoots && element.shadowRoot && element.shadowRoot !== root) {
      collectElementsAtPoint(element.shadowRoot, clientX, clientY, collectedElements);
    }

    if (canDescendIntoNestedRoots && isIframeElement(element)) {
      const iframeDocument = getAccessibleIframeDocument(element);
      if (iframeDocument) {
        const iframePosition = convertParentPositionToIframe(element, clientX, clientY);
        collectElementsAtPoint(
          iframeDocument,
          iframePosition.x,
          iframePosition.y,
          collectedElements,
        );
      }
    }

    collectedElements.add(element);
  }
};

export const getDeepElementsAtPoint = (clientX: number, clientY: number): Element[] => {
  const collectedElements = new Set<Element>();
  collectElementsAtPoint(document, clientX, clientY, collectedElements);
  return [...collectedElements];
};
