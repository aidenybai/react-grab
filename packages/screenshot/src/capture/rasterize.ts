import {
  DECODE_SETTLE_FRAME_COUNT,
  DECODED_SVG_IMAGE_CACHE_CAP,
  DEFAULT_JPEG_QUALITY,
  JPEG_FALLBACK_BACKGROUND_COLOR,
  MAX_CANVAS_DIMENSION_PX,
  RASTER_PNG_CACHE_CAP,
} from "../constants";
import type { CaptureRegionRect, CaptureResult, ResolvedCaptureOptions } from "../types";
import { blobToDataUrl } from "../utils/blob-to-data-url";
import { canvasToBlob } from "../utils/canvas-to-blob";
import { canvasToJpegBlob } from "../utils/canvas-to-jpeg-blob";
import { createFifoCache } from "../utils/create-fifo-cache";
import { encodeSvgDataUrl } from "../utils/encode-svg-data-url";
import { isBlinkEngine } from "../utils/is-blink-engine";
import { isWebKitEngine } from "../utils/is-webkit-engine";
import { raceWithAbortSignal } from "../utils/race-with-abort-signal";
import { waitForAnimationFrames } from "../utils/wait-for-animation-frames";
import { lastCaptureTimings } from "./phase-timings";

// The serialized SVG markup inlines every external resource (images, fonts,
// iframe rasters) as data URLs, so markup + raster parameters fully determine
// the output pixels; repeat captures of an unchanged tree can reuse the
// already-encoded PNG instead of paying decode + native PNG encode again.
// Nesting params under the markup key avoids concatenating a fresh
// multi-megabyte cache-key string per capture.
const encodedPngCache = createFifoCache<Map<string, Promise<Blob>>>(RASTER_PNG_CACHE_CAP);

// A decoded SVG image is immutable, so repeat rasterizations of identical
// markup (unchanged trees, backdrop underlay re-captures) can skip the SVG
// decode entirely and only pay the canvas draw.
const decodedSvgImageCache = createFifoCache<Promise<HTMLImageElement>>(
  DECODED_SVG_IMAGE_CACHE_CAP,
);

// Allocating a large canvas zero-fills its backing store (~18ms at
// 2400x4800), so the internal encode path draws into one shared scratch
// canvas that is never handed to callers; toCanvas still returns a fresh
// canvas the caller owns.
let scratchCanvas: HTMLCanvasElement | null = null;
let isScratchCanvasBusy = false;

const acquireScratchCanvas = (): HTMLCanvasElement | null => {
  if (isScratchCanvasBusy) return null;
  scratchCanvas ??= document.createElement("canvas");
  isScratchCanvasBusy = true;
  return scratchCanvas;
};

const releaseScratchCanvas = (): void => {
  isScratchCanvasBusy = false;
};

export const createCaptureResult = (
  svgMarkup: string,
  width: number,
  height: number,
  options: ResolvedCaptureOptions,
  canvasClipRect: CaptureRegionRect | null = null,
): CaptureResult => {
  // Chromium and WebKit taint canvases drawn from blob-URL SVGs that contain a
  // <foreignObject> (whatwg/html#10641); the equivalent data URL stays origin-clean,
  // so the shared decoded image must load from a data URL.
  const svgDataUrl = encodeSvgDataUrl(svgMarkup);
  // The settle frames only exist for content still compositing after
  // decode(): nested raster data-URL resources, and background-clip:text
  // (Gecko paints the text mask a frame late). Inlined fonts apply
  // synchronously during the decode layout, so font-only captures skip the
  // two-frame wait.
  const hasNestedDataUrlResources =
    svgMarkup.includes("data:image") || svgMarkup.includes("background-clip:text");
  const decodeSvgImage = (): Promise<HTMLImageElement> => {
    const cachedImagePromise = decodedSvgImageCache.get(svgDataUrl);
    if (cachedImagePromise) return cachedImagePromise;
    const decodedImagePromise = (async () => {
      const decodeStartMs = performance.now();
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
      lastCaptureTimings.decodeMs = performance.now() - decodeStartMs;
      return svgImage;
    })();
    decodedSvgImageCache.set(svgDataUrl, decodedImagePromise);
    decodedImagePromise.catch(() => {
      decodedSvgImageCache.delete(svgDataUrl);
    });
    return decodedImagePromise;
  };

  const outputWidth = canvasClipRect ? Math.max(1, Math.ceil(canvasClipRect.width)) : width;
  const outputHeight = canvasClipRect ? Math.max(1, Math.ceil(canvasClipRect.height)) : height;

  const renderToCanvas = async (
    canvas: HTMLCanvasElement,
    fallbackBackgroundColor?: string,
  ): Promise<HTMLCanvasElement> => {
    const svgImage = await raceWithAbortSignal(decodeSvgImage(), options.abortSignal);
    const rasterStartMs = performance.now();
    const rasterScale = options.scale * options.pixelRatio;
    const rawCanvasWidth = Math.ceil(outputWidth * rasterScale);
    const rawCanvasHeight = Math.ceil(outputHeight * rasterScale);
    const clampRatio = Math.min(
      1,
      MAX_CANVAS_DIMENSION_PX / Math.max(1, rawCanvasWidth),
      MAX_CANVAS_DIMENSION_PX / Math.max(1, rawCanvasHeight),
    );
    const canvasWidth = Math.max(1, Math.floor(rawCanvasWidth * clampRatio));
    const canvasHeight = Math.max(1, Math.floor(rawCanvasHeight * clampRatio));
    // A software (willReadFrequently) canvas keeps WebKit's getImageData
    // readback in the fast PNG encode path from paying a GPU flush.
    const renderingContext = canvas.getContext(
      "2d",
      isWebKitEngine() ? { willReadFrequently: true } : undefined,
    );
    if (!renderingContext) throw new Error("Could not acquire a 2d canvas context");
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    } else {
      renderingContext.setTransform(1, 0, 0, 1, 0, 0);
      renderingContext.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    const backgroundColor = options.backgroundColor ?? fallbackBackgroundColor;
    if (backgroundColor) {
      renderingContext.fillStyle = backgroundColor;
      renderingContext.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    renderingContext.scale(rasterScale * clampRatio, rasterScale * clampRatio);
    if (canvasClipRect) renderingContext.translate(-canvasClipRect.x, -canvasClipRect.y);
    renderingContext.drawImage(svgImage, 0, 0, width, height);
    lastCaptureTimings.rasterMs = performance.now() - rasterStartMs;
    return canvas;
  };

  const toCanvas = (): Promise<HTMLCanvasElement> =>
    renderToCanvas(document.createElement("canvas"));

  const toBlob = (): Promise<Blob> => {
    const clipKey = canvasClipRect
      ? `${canvasClipRect.x},${canvasClipRect.y},${canvasClipRect.width},${canvasClipRect.height}`
      : "";
    const paramsKey = `${options.scale}|${options.pixelRatio}|${options.backgroundColor ?? ""}|${width}|${height}|${clipKey}`;
    let blobPromisesByParams = encodedPngCache.get(svgMarkup);
    const cachedPngBlobPromise = blobPromisesByParams?.get(paramsKey);
    if (cachedPngBlobPromise) return cachedPngBlobPromise;
    const acquiredScratchCanvas = acquireScratchCanvas();
    const pngBlobPromise = renderToCanvas(acquiredScratchCanvas ?? document.createElement("canvas"))
      .then(async (renderedCanvas) => {
        const encodeStartMs = performance.now();
        const pngBlob = await canvasToBlob(renderedCanvas);
        lastCaptureTimings.encodeMs = performance.now() - encodeStartMs;
        return pngBlob;
      })
      .finally(() => {
        if (acquiredScratchCanvas !== null) releaseScratchCanvas();
      });
    if (blobPromisesByParams === undefined) {
      blobPromisesByParams = new Map();
      encodedPngCache.set(svgMarkup, blobPromisesByParams);
    }
    const paramsMap = blobPromisesByParams;
    paramsMap.set(paramsKey, pngBlobPromise);
    pngBlobPromise.catch(() => {
      paramsMap.delete(paramsKey);
    });
    return pngBlobPromise;
  };
  // JPEG cannot store alpha, so undefined backgrounds fall back to opaque
  // white instead of encoding transparent pixels as black.
  const toJpegBlob = async (quality: number = DEFAULT_JPEG_QUALITY): Promise<Blob> => {
    const acquiredScratchCanvas = acquireScratchCanvas();
    try {
      const renderedCanvas = await renderToCanvas(
        acquiredScratchCanvas ?? document.createElement("canvas"),
        JPEG_FALLBACK_BACKGROUND_COLOR,
      );
      const encodeStartMs = performance.now();
      const jpegBlob = await canvasToJpegBlob(renderedCanvas, quality);
      lastCaptureTimings.encodeMs = performance.now() - encodeStartMs;
      return jpegBlob;
    } finally {
      if (acquiredScratchCanvas !== null) releaseScratchCanvas();
    }
  };
  const toPngDataUrl = async (): Promise<string> => blobToDataUrl(await toBlob());
  const toJpegDataUrl = async (quality?: number): Promise<string> =>
    blobToDataUrl(await toJpegBlob(quality));
  const toSvgDataUrl = (): Promise<string> => Promise.resolve(svgDataUrl);

  return {
    width: outputWidth,
    height: outputHeight,
    toSvgDataUrl,
    toCanvas,
    toBlob,
    toJpegBlob,
    toPngDataUrl,
    toJpegDataUrl,
  };
};
