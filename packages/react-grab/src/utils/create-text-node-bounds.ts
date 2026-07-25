import type { OverlayBounds } from "../types.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";

export const createTextNodeBounds = (textNode: Text): OverlayBounds => {
  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  const rect = range.getBoundingClientRect();
  const topWindowPosition = convertClientPositionToTopWindow(
    textNode.ownerDocument.defaultView,
    rect.left,
    rect.top,
  );

  return {
    borderRadius: "0px",
    height: rect.height * topWindowPosition.scaleY,
    width: rect.width * topWindowPosition.scaleX,
    x: topWindowPosition.x,
    y: topWindowPosition.y,
  };
};
