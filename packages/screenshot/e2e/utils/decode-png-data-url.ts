import { PNG } from "pngjs";

export const decodePngDataUrl = (dataUrl: string): PNG => {
  const base64Payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return PNG.sync.read(Buffer.from(base64Payload, "base64"));
};
