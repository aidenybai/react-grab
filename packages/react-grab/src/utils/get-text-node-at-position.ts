import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";
import { isPointInsideRect } from "./is-point-inside-rect.js";
import { isTextNode } from "./is-text-node.js";

export const getTextNodeAtPosition = (
  parentElement: Element,
  clientX: number,
  clientY: number,
): Text | null => {
  if (parentElement.children.length === 0) return null;

  const range = parentElement.ownerDocument.createRange();

  for (const childNode of parentElement.childNodes) {
    if (!isTextNode(childNode) || !childNode.textContent?.trim()) continue;

    range.selectNodeContents(childNode);
    for (const rect of range.getClientRects()) {
      const topWindowPosition = convertClientPositionToTopWindow(
        parentElement.ownerDocument.defaultView,
        rect.left,
        rect.top,
      );
      const topWindowRect = {
        left: topWindowPosition.x,
        top: topWindowPosition.y,
        right: topWindowPosition.x + rect.width * topWindowPosition.scaleX,
        bottom: topWindowPosition.y + rect.height * topWindowPosition.scaleY,
      };
      if (isPointInsideRect(clientX, clientY, topWindowRect)) return childNode;
    }
  }

  return null;
};
