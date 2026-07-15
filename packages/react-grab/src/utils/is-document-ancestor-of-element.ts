import { getWindowFrameElement } from "./get-window-frame-element.js";

export const isDocumentAncestorOfElement = (
  ancestorDocument: Document,
  element: Element,
): boolean => {
  let currentDocument: Document | null = element.ownerDocument;
  while (currentDocument) {
    if (currentDocument === ancestorDocument) return true;
    const parentFrameElement = getWindowFrameElement(currentDocument.defaultView);
    currentDocument = parentFrameElement?.ownerDocument ?? null;
  }
  return false;
};
