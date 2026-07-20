import type { Page } from "@playwright/test";

interface EncodedScreenshotPair {
  before: string;
  after: string;
}

export const countScreenshotPixelDifferences = async (
  page: Page,
  beforeScreenshot: Buffer,
  afterScreenshot: Buffer,
): Promise<number> =>
  page.evaluate(
    async (screenshots: EncodedScreenshotPair) => {
      const decodeScreenshot = async (encodedScreenshot: string): Promise<ImageData> => {
        const response = await fetch(`data:image/png;base64,${encodedScreenshot}`);
        const imageBitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement("canvas");
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas context unavailable while comparing screenshots");
        context.drawImage(imageBitmap, 0, 0);
        imageBitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };

      const beforeImage = await decodeScreenshot(screenshots.before);
      const afterImage = await decodeScreenshot(screenshots.after);
      if (beforeImage.width !== afterImage.width || beforeImage.height !== afterImage.height) {
        return Number.POSITIVE_INFINITY;
      }

      let changedPixelCount = 0;
      for (let byteIndex = 0; byteIndex < beforeImage.data.length; byteIndex += 4) {
        if (
          beforeImage.data[byteIndex] !== afterImage.data[byteIndex] ||
          beforeImage.data[byteIndex + 1] !== afterImage.data[byteIndex + 1] ||
          beforeImage.data[byteIndex + 2] !== afterImage.data[byteIndex + 2] ||
          beforeImage.data[byteIndex + 3] !== afterImage.data[byteIndex + 3]
        ) {
          changedPixelCount++;
        }
      }
      return changedPixelCount;
    },
    {
      before: beforeScreenshot.toString("base64"),
      after: afterScreenshot.toString("base64"),
    },
  );
