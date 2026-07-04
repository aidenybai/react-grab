import { encodePngFromCanvas } from "./encode-png-from-canvas";
import { isWebKitEngine } from "./is-webkit-engine";

const nativeCanvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob produced no data"));
    }, "image/png");
  });

// WebKit's native PNG encoder is an order of magnitude slower than Blink's,
// so there the PNG container is assembled by hand around CompressionStream.
export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  if (isWebKitEngine() && typeof CompressionStream !== "undefined") {
    return encodePngFromCanvas(canvas).catch(() => nativeCanvasToBlob(canvas));
  }
  return nativeCanvasToBlob(canvas);
};
