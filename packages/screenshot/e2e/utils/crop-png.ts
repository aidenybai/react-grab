import { PNG } from "pngjs";

export const cropPng = (source: PNG, widthPx: number, heightPx: number): PNG => {
  if (source.width === widthPx && source.height === heightPx) {
    return source;
  }
  const croppedPng = new PNG({ width: widthPx, height: heightPx });
  PNG.bitblt(source, croppedPng, 0, 0, widthPx, heightPx, 0, 0);
  return croppedPng;
};
