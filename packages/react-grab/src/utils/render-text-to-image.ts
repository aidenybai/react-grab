import {
  TEXT_IMAGE_FONT_SIZE_PX,
  TEXT_IMAGE_LINE_HEIGHT_PX,
  TEXT_IMAGE_PADDING_PX,
  TEXT_IMAGE_FONT_FAMILY,
  TEXT_IMAGE_BACKGROUND_COLOR,
  TEXT_IMAGE_TEXT_COLOR,
  TEXT_IMAGE_TAB_SIZE_SPACES,
} from "../constants.js";

export const renderTextToImage = async (text: string): Promise<Blob> => {
  const lines = text
    .replace(/\t/g, " ".repeat(TEXT_IMAGE_TAB_SIZE_SPACES))
    .split("\n");

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context not available");
  }

  context.font = `${TEXT_IMAGE_FONT_SIZE_PX}px ${TEXT_IMAGE_FONT_FAMILY}`;
  const characterWidth = context.measureText("M").width;

  const longestLineLength = lines.reduce(
    (maxLength, line) => Math.max(maxLength, line.length),
    0,
  );

  const contentWidth = Math.ceil(longestLineLength * characterWidth);
  const contentHeight = lines.length * TEXT_IMAGE_LINE_HEIGHT_PX;

  canvas.width = contentWidth + TEXT_IMAGE_PADDING_PX * 2;
  canvas.height = contentHeight + TEXT_IMAGE_PADDING_PX * 2;

  context.fillStyle = TEXT_IMAGE_BACKGROUND_COLOR;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = `${TEXT_IMAGE_FONT_SIZE_PX}px ${TEXT_IMAGE_FONT_FAMILY}`;
  context.fillStyle = TEXT_IMAGE_TEXT_COLOR;
  context.textBaseline = "top";

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const xPosition = TEXT_IMAGE_PADDING_PX;
    const yPosition =
      TEXT_IMAGE_PADDING_PX + lineIndex * TEXT_IMAGE_LINE_HEIGHT_PX;
    context.fillText(lines[lineIndex], xPosition, yPosition);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create image blob from canvas"));
      }
    }, "image/png");
  });
};
