import { captureNode, captureRegion } from "fast-html-to-image";
import {
  SCREENSHOT_NOTE_BACKGROUND,
  SCREENSHOT_NOTE_FONT_SIZE_PX,
  SCREENSHOT_NOTE_HEADER_COLOR,
  SCREENSHOT_NOTE_LINE_HEIGHT_PX,
  SCREENSHOT_NOTE_PADDING_PX,
  SCREENSHOT_NOTE_TEXT_COLOR,
} from "../constants.js";
import { combineBounds } from "./combine-bounds.js";
import { hasReactGrabAttribute } from "./is-valid-grabbable-element.js";

const captureElements = (elements: Element[]) => {
  const filterNode = (candidateElement: Element) => !hasReactGrabAttribute(candidateElement);
  if (elements.length === 1) {
    return captureNode(elements[0], { bleed: "auto", filterNode });
  }
  const region = combineBounds(elements.map((element) => element.getBoundingClientRect()));
  return captureRegion(region, { filterNode });
};

const encodeCanvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) resolve(pngBlob);
      else reject(new Error("Failed to encode annotated screenshot"));
    }, "image/png");
  });

export const renderAnnotatedScreenshot = async (
  elements: Element[],
  noteLines: string[],
): Promise<Blob> => {
  const captureResult = await captureElements(elements);
  if (noteLines.length === 0) return captureResult.toBlob();

  const capturedCanvas = await captureResult.toCanvas();
  const pixelScale = Math.max(1, capturedCanvas.width / Math.max(1, captureResult.width));
  const noteBarHeight = Math.round(
    (SCREENSHOT_NOTE_PADDING_PX * 2 + noteLines.length * SCREENSHOT_NOTE_LINE_HEIGHT_PX) *
      pixelScale,
  );

  const annotatedCanvas = document.createElement("canvas");
  annotatedCanvas.width = capturedCanvas.width;
  annotatedCanvas.height = capturedCanvas.height + noteBarHeight;
  const context = annotatedCanvas.getContext("2d");
  if (!context) return captureResult.toBlob();

  context.drawImage(capturedCanvas, 0, 0);
  context.fillStyle = SCREENSHOT_NOTE_BACKGROUND;
  context.fillRect(0, capturedCanvas.height, annotatedCanvas.width, noteBarHeight);
  context.font = `${SCREENSHOT_NOTE_FONT_SIZE_PX * pixelScale}px ui-monospace, Menlo, Consolas, monospace`;
  context.textBaseline = "middle";

  for (const [lineIndex, noteLine] of noteLines.entries()) {
    context.fillStyle = lineIndex === 0 ? SCREENSHOT_NOTE_HEADER_COLOR : SCREENSHOT_NOTE_TEXT_COLOR;
    const lineCenterY =
      capturedCanvas.height +
      (SCREENSHOT_NOTE_PADDING_PX + (lineIndex + 0.5) * SCREENSHOT_NOTE_LINE_HEIGHT_PX) *
        pixelScale;
    context.fillText(noteLine, SCREENSHOT_NOTE_PADDING_PX * pixelScale, lineCenterY);
  }

  return encodeCanvasToPngBlob(annotatedCanvas);
};
