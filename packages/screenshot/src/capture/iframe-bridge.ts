import {
  IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE,
  IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE,
  IFRAME_BRIDGE_RESPONSE_TIMEOUT_MS,
} from "../constants";
import type { IframeBridgeRequestMessage, IframeContentSnapshot } from "../types";
import { findDocumentBackgroundColor } from "../utils/find-document-background-color";
import {
  parseIframeBridgeRequestMessage,
  parseIframeBridgeResponseMessage,
} from "../utils/parse-iframe-bridge-messages";

export const requestIframeContentViaBridge = (
  iframe: HTMLIFrameElement,
  pixelRatio: number,
): Promise<IframeContentSnapshot | null> => {
  const contentWindow = iframe.contentWindow;
  const parentView = iframe.ownerDocument.defaultView;
  if (!contentWindow || !parentView) return Promise.resolve(null);
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve) => {
    const settle = (snapshot: IframeContentSnapshot | null): void => {
      parentView.clearTimeout(timeoutId);
      parentView.removeEventListener("message", handleMessage);
      resolve(snapshot);
    };
    const handleMessage = (event: MessageEvent): void => {
      if (event.source !== contentWindow) return;
      const response = parseIframeBridgeResponseMessage(event.data);
      if (!response || response.requestId !== requestId) return;
      settle({
        pngDataUrl: response.pngDataUrl,
        widthPx: response.widthPx,
        heightPx: response.heightPx,
        canvasBackgroundColor: response.backgroundColor,
      });
    };
    const timeoutId = parentView.setTimeout(
      () => settle(null),
      IFRAME_BRIDGE_RESPONSE_TIMEOUT_MS,
    );
    parentView.addEventListener("message", handleMessage);
    const request: IframeBridgeRequestMessage = {
      type: IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE,
      requestId,
      pixelRatio,
    };
    contentWindow.postMessage(request, "*");
  });
};

export const createIframeBridge = (
  captureDocumentRoot: (pixelRatio: number) => Promise<{
    pngDataUrl: string;
    widthPx: number;
    heightPx: number;
  }>,
): (() => void) => {
  const handleMessage = (event: MessageEvent): void => {
    const request = parseIframeBridgeRequestMessage(event.data);
    const requestSource = event.source;
    if (!request || !requestSource) return;
    void captureDocumentRoot(request.pixelRatio)
      .then((capture) => {
        requestSource.postMessage(
          {
            type: IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE,
            requestId: request.requestId,
            pngDataUrl: capture.pngDataUrl,
            widthPx: capture.widthPx,
            heightPx: capture.heightPx,
            backgroundColor: findDocumentBackgroundColor(document),
          },
          { targetOrigin: "*" },
        );
      })
      .catch(() => {
        // A failed capture sends no response; the requesting side times out
        // and falls back to the flat iframe placeholder.
      });
  };
  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
};
