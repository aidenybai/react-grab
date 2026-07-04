import {
  DECODE_SETTLE_FRAME_COUNT,
  MAX_CANVAS_DIMENSION_PX,
  RASTER_PNG_CACHE_CAP,
} from "../constants";
import type { CaptureResult, ResolvedCaptureOptions } from "../types";
import { blobToDataUrl } from "../utils/blob-to-data-url";
import { canvasToBlob } from "../utils/canvas-to-blob";
import { createFifoCache } from "../utils/create-fifo-cache";
import { isBlinkEngine } from "../utils/is-blink-engine";
import { raceWithAbortSignal } from "../utils/race-with-abort-signal";
import { waitForAnimationFrames } from "../utils/wait-for-animation-frames";

// The serialized SVG markup inlines every external resource (images, fonts,
// iframe rasters) as data URLs, so markup + raster parameters fully determine
// the output pixels; repeat captures of an unchanged tree can reuse the
// already-encoded PNG instead of paying decode + native PNG encode again.
const encodedPngCache = createFifoCache<Promise<Blob>>(RASTER_PNG_CACHE_CAP);

export const createCaptureResult = (
  svgMarkup: string,
  width: number,
  height: number,
  options: ResolvedCaptureOptions,
): CaptureResult => {
  // Chromium and WebKit taint canvases drawn from blob-URL SVGs that contain a
  // <foreignObject> (whatwg/html#10641); the equivalent data URL stays origin-clean,
  // so the shared decoded image must load from a data URL.
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  // The settle frames only exist for nested data-URL resources (inlined images,
  // fonts) still compositing after decode(); a capture without any skips them.
  const hasNestedDataUrlResources = svgMarkup.includes("data:");
  let decodedImagePromise: Promise<HTMLImageElement> | null = null;

  const decodeSvgImage = (): Promise<HTMLImageElement> => {
    decodedImagePromise ??= (async () => {
      const svgImage = new Image();
      svgImage.decoding = "sync";
      svgImage.src = svgDataUrl;
      await svgImage.decode();
      // In Gecko and WebKit, decode() can resolve before nested data-URL
      // resources inside the foreignObject finish compositing; two animation
      // frames let them settle. Blink fully rasterizes before decode()
      // resolves, so the settle there would only add ~2 frames of latency.
      if (!isBlinkEngine() && hasNestedDataUrlResources) {
        await waitForAnimationFrames(DECODE_SETTLE_FRAME_COUNT);
      }
      return svgImage;
    })().catch((decodeError: unknown) => {
      decodedImagePromise = null;
      throw decodeError;
    });
    return decodedImagePromise;
  };

  const toCanvas = async (): Promise<HTMLCanvasElement> => {
    const svgImage = await raceWithAbortSignal(decodeSvgImage(), options.abortSignal);
    const rasterScale = options.scale * options.pixelRatio;
    const rawCanvasWidth = Math.ceil(width * rasterScale);
    const rawCanvasHeight = Math.ceil(height * rasterScale);
    const clampRatio = Math.min(
      1,
      MAX_CANVAS_DIMENSION_PX / Math.max(1, rawCanvasWidth),
      MAX_CANVAS_DIMENSION_PX / Math.max(1, rawCanvasHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(rawCanvasWidth * clampRatio));
    canvas.height = Math.max(1, Math.floor(rawCanvasHeight * clampRatio));
    const renderingContext = canvas.getContext("2d");
    if (!renderingContext) throw new Error("Could not acquire a 2d canvas context");
    if (options.backgroundColor) {
      renderingContext.fillStyle = options.backgroundColor;
      renderingContext.fillRect(0, 0, canvas.width, canvas.height);
    }
    renderingContext.scale(rasterScale * clampRatio, rasterScale * clampRatio);
    renderingContext.drawImage(svgImage, 0, 0, width, height);
    return canvas;
  };

  const toBlob = (): Promise<Blob> => {
    const cacheKey = `${options.scale}|${options.pixelRatio}|${options.backgroundColor ?? ""}|${width}|${height}|${svgMarkup}`;
    const cachedPngBlobPromise = encodedPngCache.get(cacheKey);
    if (cachedPngBlobPromise) return cachedPngBlobPromise;
    const pngBlobPromise = toCanvas().then(canvasToBlob);
    encodedPngCache.set(cacheKey, pngBlobPromise);
    pngBlobPromise.catch(() => {
      encodedPngCache.delete(cacheKey);
    });
    return pngBlobPromise;
  };
  const toPngDataUrl = async (): Promise<string> => blobToDataUrl(await toBlob());
  const toSvgDataUrl = (): Promise<string> => Promise.resolve(svgDataUrl);

  return { width, height, toSvgDataUrl, toCanvas, toBlob, toPngDataUrl };
};
