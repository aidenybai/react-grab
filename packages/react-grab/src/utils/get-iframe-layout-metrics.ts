import { IFRAME_LAYOUT_METRICS_CACHE_TTL_MS } from "../constants.js";

interface IframeLayoutMetrics {
  contentOffsetX: number;
  contentOffsetY: number;
  height: number;
  width: number;
}

interface CachedIframeLayoutMetrics {
  metrics: IframeLayoutMetrics;
  timestamp: number;
}

const layoutMetricsCache = new WeakMap<HTMLIFrameElement, CachedIframeLayoutMetrics>();

const parseCssLength = (value: string): number => {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const getIframeLayoutMetrics = (iframeElement: HTMLIFrameElement): IframeLayoutMetrics => {
  const now = performance.now();
  const cachedMetrics = layoutMetricsCache.get(iframeElement);
  if (cachedMetrics && now - cachedMetrics.timestamp < IFRAME_LAYOUT_METRICS_CACHE_TTL_MS) {
    return cachedMetrics.metrics;
  }

  const computedStyle = iframeElement.ownerDocument.defaultView?.getComputedStyle(iframeElement);
  let metrics: IframeLayoutMetrics;

  if (!computedStyle) {
    metrics = {
      contentOffsetX: iframeElement.clientLeft,
      contentOffsetY: iframeElement.clientTop,
      height: iframeElement.offsetHeight,
      width: iframeElement.offsetWidth,
    };
  } else {
    const borderLeftWidth = parseCssLength(computedStyle.borderLeftWidth);
    const borderRightWidth = parseCssLength(computedStyle.borderRightWidth);
    const borderTopWidth = parseCssLength(computedStyle.borderTopWidth);
    const borderBottomWidth = parseCssLength(computedStyle.borderBottomWidth);
    const paddingLeft = parseCssLength(computedStyle.paddingLeft);
    const paddingRight = parseCssLength(computedStyle.paddingRight);
    const paddingTop = parseCssLength(computedStyle.paddingTop);
    const paddingBottom = parseCssLength(computedStyle.paddingBottom);
    const computedWidth = parseCssLength(computedStyle.width);
    const computedHeight = parseCssLength(computedStyle.height);
    const horizontalInsets = borderLeftWidth + borderRightWidth + paddingLeft + paddingRight;
    const verticalInsets = borderTopWidth + borderBottomWidth + paddingTop + paddingBottom;
    const layoutWidth =
      computedStyle.boxSizing === "border-box" ? computedWidth : computedWidth + horizontalInsets;
    const layoutHeight =
      computedStyle.boxSizing === "border-box" ? computedHeight : computedHeight + verticalInsets;

    metrics = {
      contentOffsetX: borderLeftWidth + paddingLeft,
      contentOffsetY: borderTopWidth + paddingTop,
      height: layoutHeight > 0 ? layoutHeight : iframeElement.offsetHeight,
      width: layoutWidth > 0 ? layoutWidth : iframeElement.offsetWidth,
    };
  }

  layoutMetricsCache.set(iframeElement, { metrics, timestamp: now });
  return metrics;
};
