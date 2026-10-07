import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { isHtmlElement } from "./is-html-element.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isReactGrabElement } from "./is-react-grab-element.js";

const collectHoveredElements = (
  root: Document | ShadowRoot,
  hoveredElements: Set<HTMLElement>,
): void => {
  for (const element of root.querySelectorAll(":hover")) {
    if (isReactGrabElement(element)) continue;
    if (isHtmlElement(element)) hoveredElements.add(element);
    if (element.shadowRoot) collectHoveredElements(element.shadowRoot, hoveredElements);
    if (isIframeElement(element)) {
      const iframeDocument = getAccessibleIframeDocument(element);
      if (iframeDocument) collectHoveredElements(iframeDocument, hoveredElements);
    }
  }
};

export const getDeepHoveredElements = (): HTMLElement[] => {
  const hoveredElements = new Set<HTMLElement>();
  collectHoveredElements(document, hoveredElements);
  return [...hoveredElements];
};
