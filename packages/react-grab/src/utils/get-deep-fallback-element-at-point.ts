import { convertParentPositionToIframe } from "./convert-parent-position-to-iframe.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isUserIgnoredElement } from "./is-user-ignored-element.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { isWithinScope } from "./runtime-mode.js";

const findDeepFallbackElementAtPoint = (
  root: Document | ShadowRoot,
  clientX: number,
  clientY: number,
): Element | null => {
  let canDescendIntoNestedRoots = true;

  for (const candidateElement of root.elementsFromPoint(clientX, clientY)) {
    if (isUserIgnoredElement(candidateElement)) canDescendIntoNestedRoots = false;
    if (!isWithinScope(candidateElement)) continue;

    const shadowRoot = candidateElement.shadowRoot;
    if (canDescendIntoNestedRoots && shadowRoot && shadowRoot !== root) {
      const shadowTarget = findDeepFallbackElementAtPoint(shadowRoot, clientX, clientY);
      if (shadowTarget) return shadowTarget;
    }

    if (canDescendIntoNestedRoots && isIframeElement(candidateElement)) {
      const iframeDocument = getAccessibleIframeDocument(candidateElement);
      if (iframeDocument) {
        const iframePosition = convertParentPositionToIframe(candidateElement, clientX, clientY);
        const iframeTarget = findDeepFallbackElementAtPoint(
          iframeDocument,
          iframePosition.x,
          iframePosition.y,
        );
        if (iframeTarget) return iframeTarget;
      }
    }

    if (!isValidGrabbableElement(candidateElement)) continue;
    return candidateElement;
  }

  return null;
};

export const getDeepFallbackElementAtPoint = (clientX: number, clientY: number): Element | null =>
  findDeepFallbackElementAtPoint(document, clientX, clientY);
