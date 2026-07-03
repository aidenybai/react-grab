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
  if (!contentWindow) return Promise.resolve(null);
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve) => {
    const settle = (snapshot: IframeContentSnapshot | null): void => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
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
    // The response lands on the realm that sends the request (event.source on
    // the bridge side is this realm's window, even when the iframe belongs to a
    // nested same-origin document), so the listener goes on the module's own
    // window rather than the iframe's parent view.
    const timeoutId = window.setTimeout(() => settle(null), IFRAME_BRIDGE_RESPONSE_TIMEOUT_MS);
    window.addEventListener("message", handleMessage);
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
  // Mutually-embedding documents with bridges on both sides would otherwise
  // recurse forever (capture -> bridge request -> capture -> ...); ignoring
  // requests while a bridge capture is in flight breaks the cycle and lets
  // the requester time out to the flat placeholder.
  let isBridgeCaptureInFlight = false;
  const handleMessage = (event: MessageEvent): void => {
    const request = parseIframeBridgeRequestMessage(event.data);
    const requestSource = event.source;
    if (!request || !requestSource || isBridgeCaptureInFlight) return;
    isBridgeCaptureInFlight = true;
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
      })
      .finally(() => {
        isBridgeCaptureInFlight = false;
      });
  };
  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
};
