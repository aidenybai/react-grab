import { MIN_DEVICE_PIXEL_RATIO } from "../../constants.js";
import { serializeElement } from "./serialize-element.js";

interface ElementToPngOptions {
  devicePixelRatio?: number;
}

const buildSvgDataUrl = (
  serializedHtml: string,
  cssBlocks: string[],
  viewportWidth: number,
  viewportHeight: number,
  scaledWidth: number,
  scaledHeight: number,
): string => {
  const combinedCss = cssBlocks.filter(Boolean).join("\n");

  const svgNamespace = "http://www.w3.org/2000/svg";
  const xhtmlNamespace = "http://www.w3.org/1999/xhtml";

  const svgStyleElement = combinedCss
    ? `<style><![CDATA[${combinedCss}]]></style>`
    : "";

  const svgString =
    `<svg xmlns="${svgNamespace}" width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${viewportWidth} ${viewportHeight}">` +
    `${svgStyleElement}` +
    `<foreignObject width="${viewportWidth}" height="${viewportHeight}">` +
    `<div xmlns="${xhtmlNamespace}" style="width:${viewportWidth}px;height:${viewportHeight}px;overflow:hidden;">` +
    `${serializedHtml}` +
    `</div>` +
    `</foreignObject>` +
    `</svg>`;

  const utf8Bytes = new TextEncoder().encode(svgString);
  const CHUNK_SIZE = 8192;
  let binaryString = "";
  for (let offset = 0; offset < utf8Bytes.length; offset += CHUNK_SIZE) {
    const chunk = utf8Bytes.subarray(offset, offset + CHUNK_SIZE);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return `data:image/svg+xml;base64,${btoa(binaryString)}`;
};

const loadImage = (sourceUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const imageElement = new Image();
    imageElement.onload = () => resolve(imageElement);
    imageElement.onerror = () => reject(new Error("Failed to load SVG as image"));
    imageElement.src = sourceUrl;
  });

export const elementToPngBlob = async (
  sourceElement: Element,
  options: ElementToPngOptions = {},
): Promise<Blob> => {
  const rect = sourceElement.getBoundingClientRect();
  const elementWidth = Math.ceil(rect.width);
  const elementHeight = Math.ceil(rect.height);

  if (elementWidth <= 0 || elementHeight <= 0) {
    throw new Error("Element has zero dimensions");
  }

  const scaleFactor = Math.max(
    options.devicePixelRatio ?? window.devicePixelRatio,
    MIN_DEVICE_PIXEL_RATIO,
  );

  const serialized = await serializeElement(sourceElement, {
    inlineImages: true,
    embedFonts: true,
  });

  if (serialized.status !== "success" || !serialized.html) {
    throw new Error("Element serialization failed");
  }

  const scaledWidth = Math.ceil(elementWidth * scaleFactor);
  const scaledHeight = Math.ceil(elementHeight * scaleFactor);

  const svgDataUrl = buildSvgDataUrl(
    serialized.html,
    [serialized.baseCss, serialized.fontsCss, serialized.shadowCss, serialized.scrollbarCss, serialized.elementCss],
    elementWidth,
    elementHeight,
    scaledWidth,
    scaledHeight,
  );

  const image = await loadImage(svgDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("Failed to get canvas 2d context");
  }

  canvasContext.drawImage(image, 0, 0, scaledWidth, scaledHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas.toBlob returned null"));
        }
      },
      "image/png",
    );
  });
};
