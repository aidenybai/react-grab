import { isIframeElement } from "./is-iframe-element.js";
import { getIframeLayoutMetrics } from "./get-iframe-layout-metrics.js";
import { getIframeScale } from "./get-iframe-scale.js";
import { getWindowFrameElement } from "./get-window-frame-element.js";

interface TopWindowClientPosition {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export const convertClientPositionToTopWindow = (
  ownerWindow: Window | null,
  clientX: number,
  clientY: number,
): TopWindowClientPosition => {
  let convertedX = clientX;
  let convertedY = clientY;
  let cumulativeScaleX = 1;
  let cumulativeScaleY = 1;
  let currentWindow = ownerWindow;

  while (currentWindow && currentWindow !== window) {
    const frameElement = getWindowFrameElement(currentWindow);
    if (!frameElement || !isIframeElement(frameElement)) break;

    const frameBounds = frameElement.getBoundingClientRect();
    const layoutMetrics = getIframeLayoutMetrics(frameElement);
    const frameScaleX = getIframeScale(frameBounds.width, layoutMetrics.width);
    const frameScaleY = getIframeScale(frameBounds.height, layoutMetrics.height);

    convertedX = frameBounds.left + (layoutMetrics.contentOffsetX + convertedX) * frameScaleX;
    convertedY = frameBounds.top + (layoutMetrics.contentOffsetY + convertedY) * frameScaleY;
    cumulativeScaleX *= frameScaleX;
    cumulativeScaleY *= frameScaleY;
    currentWindow = frameElement.ownerDocument.defaultView;
  }

  return {
    x: convertedX,
    y: convertedY,
    scaleX: cumulativeScaleX,
    scaleY: cumulativeScaleY,
  };
};
