import type { Position } from "../types.js";
import { convertParentPositionToIframe } from "./convert-parent-position-to-iframe.js";
import { getWindowFrameElement } from "./get-window-frame-element.js";
import { isIframeElement } from "./is-iframe-element.js";

export const convertTopWindowPositionToClient = (
  ownerWindow: Window | null,
  clientX: number,
  clientY: number,
): Position => {
  const frameElements: HTMLIFrameElement[] = [];
  let currentWindow = ownerWindow;

  while (currentWindow && currentWindow !== window) {
    const frameElement = getWindowFrameElement(currentWindow);
    if (!frameElement || !isIframeElement(frameElement)) break;
    frameElements.push(frameElement);
    currentWindow = frameElement.ownerDocument.defaultView;
  }

  let convertedX = clientX;
  let convertedY = clientY;
  for (let frameIndex = frameElements.length - 1; frameIndex >= 0; frameIndex -= 1) {
    const convertedPosition = convertParentPositionToIframe(
      frameElements[frameIndex],
      convertedX,
      convertedY,
    );
    convertedX = convertedPosition.x;
    convertedY = convertedPosition.y;
  }

  return { x: convertedX, y: convertedY };
};
