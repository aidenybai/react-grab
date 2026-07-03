import { Buffer } from "node:buffer";

export const pngDataUrlByteLength = (dataUrl: string): number => {
  const base64Payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Buffer.from(base64Payload, "base64").byteLength;
};
