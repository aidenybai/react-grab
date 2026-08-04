import { SVG_TEXT_HIT_TEST_MAX_ELEMENTS } from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const isSvgTextElement = (element: Element): boolean =>
  element.localName === "text" || element.localName === "tspan" || element.localName === "textPath";

const containsPoint = (element: Element, clientX: number, clientY: number): boolean => {
  const bounds = element.getBoundingClientRect();
  let left = bounds.left;
  let top = bounds.top;
  let width = bounds.width;
  let height = bounds.height;
  const ownerWindow = element.ownerDocument.defaultView;

  if (ownerWindow && typeof window !== "undefined" && ownerWindow !== window) {
    const topWindowPosition = convertClientPositionToTopWindow(ownerWindow, left, top);
    left = topWindowPosition.x;
    top = topWindowPosition.y;
    width *= topWindowPosition.scaleX;
    height *= topWindowPosition.scaleY;
  }

  return (
    width > 0 &&
    height > 0 &&
    clientX >= left &&
    clientX <= left + width &&
    clientY >= top &&
    clientY <= top + height
  );
};

export const getSvgTextElementAtPoint = (
  hitElement: Element,
  clientX: number,
  clientY: number,
): Element | null => {
  if (hitElement.namespaceURI !== SVG_NAMESPACE) return null;

  let searchRootElement = hitElement;
  let parentElement = hitElement.parentElement;
  while (parentElement?.namespaceURI === SVG_NAMESPACE) {
    searchRootElement = parentElement;
    parentElement = parentElement.parentElement;
  }

  let candidateElement = searchRootElement.lastElementChild;
  let scannedElementCount = 0;

  while (candidateElement && scannedElementCount < SVG_TEXT_HIT_TEST_MAX_ELEMENTS) {
    scannedElementCount += 1;

    if (isSvgTextElement(candidateElement) && containsPoint(candidateElement, clientX, clientY)) {
      return candidateElement;
    }

    if (candidateElement.lastElementChild) {
      candidateElement = candidateElement.lastElementChild;
      continue;
    }

    while (candidateElement !== searchRootElement && !candidateElement.previousElementSibling) {
      candidateElement = candidateElement.parentElement;
      if (!candidateElement) return null;
    }

    if (candidateElement === searchRootElement) return null;
    candidateElement = candidateElement.previousElementSibling;
  }

  return null;
};
