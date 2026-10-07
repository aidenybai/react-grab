import { getIframeLayoutMetrics } from "./get-iframe-layout-metrics.js";
import { getIframeScale } from "./get-iframe-scale.js";

interface IframeClientPosition {
  x: number;
  y: number;
}

export const convertParentPositionToIframe = (
  iframeElement: HTMLIFrameElement,
  clientX: number,
  clientY: number,
): IframeClientPosition => {
  const iframeBounds = iframeElement.getBoundingClientRect();
  const layoutMetrics = getIframeLayoutMetrics(iframeElement);
  const scaleX = getIframeScale(iframeBounds.width, layoutMetrics.width);
  const scaleY = getIframeScale(iframeBounds.height, layoutMetrics.height);

  return {
    x: (clientX - iframeBounds.left) / scaleX - layoutMetrics.contentOffsetX,
    y: (clientY - iframeBounds.top) / scaleY - layoutMetrics.contentOffsetY,
  };
};
