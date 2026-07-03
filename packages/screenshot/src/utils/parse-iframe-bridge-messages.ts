import {
  IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE,
  IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE,
} from "../constants";
import type { IframeBridgeRequestMessage, IframeBridgeResponseMessage } from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseIframeBridgeRequestMessage = (
  data: unknown,
): IframeBridgeRequestMessage | null => {
  if (!isRecord(data)) return null;
  const { type, requestId, pixelRatio } = data;
  if (type !== IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE) return null;
  if (typeof requestId !== "string" || requestId.length === 0) return null;
  if (typeof pixelRatio !== "number" || !Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return null;
  }
  return { type, requestId, pixelRatio };
};

export const parseIframeBridgeResponseMessage = (
  data: unknown,
): IframeBridgeResponseMessage | null => {
  if (!isRecord(data)) return null;
  const { type, requestId, pngDataUrl, widthPx, heightPx, backgroundColor } = data;
  if (type !== IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE) return null;
  if (typeof requestId !== "string" || requestId.length === 0) return null;
  if (typeof pngDataUrl !== "string" || !pngDataUrl.startsWith("data:image/")) return null;
  if (typeof widthPx !== "number" || !Number.isFinite(widthPx) || widthPx <= 0) return null;
  if (typeof heightPx !== "number" || !Number.isFinite(heightPx) || heightPx <= 0) return null;
  if (backgroundColor !== null && typeof backgroundColor !== "string") return null;
  return { type, requestId, pngDataUrl, widthPx, heightPx, backgroundColor };
};
