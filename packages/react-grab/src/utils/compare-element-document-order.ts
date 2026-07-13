import { isDocumentNode } from "./is-document-node.js";
import { isShadowRoot } from "./is-shadow-root.js";
import { getWindowFrameElement } from "./get-window-frame-element.js";

const getBoundaryPath = (element: Element): Element[] => {
  const boundaryPath: Element[] = [];
  let currentElement: Element | null = element;

  while (currentElement) {
    boundaryPath.unshift(currentElement);
    const rootNode = currentElement.getRootNode();
    if (isShadowRoot(rootNode)) {
      currentElement = rootNode.host;
      continue;
    }
    if (!isDocumentNode(rootNode)) break;
    currentElement = getWindowFrameElement(rootNode.defaultView);
  }

  return boundaryPath;
};

export const compareElementDocumentOrder = (
  leftElement: Element,
  rightElement: Element,
): number => {
  if (leftElement === rightElement) return 0;

  const leftBoundaryPath = getBoundaryPath(leftElement);
  const rightBoundaryPath = getBoundaryPath(rightElement);
  const sharedPathLength = Math.min(leftBoundaryPath.length, rightBoundaryPath.length);

  for (let pathIndex = 0; pathIndex < sharedPathLength; pathIndex += 1) {
    const leftBoundaryElement = leftBoundaryPath[pathIndex];
    const rightBoundaryElement = rightBoundaryPath[pathIndex];
    if (leftBoundaryElement === rightBoundaryElement) continue;

    const position = leftBoundaryElement.compareDocumentPosition(rightBoundaryElement);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  }

  return leftBoundaryPath.length - rightBoundaryPath.length;
};
