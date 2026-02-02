import type { Plugin } from "../../types.js";
import { SCREENSHOT_CAPTURE_DELAY_MS } from "../../constants.js";
import {
  captureElementScreenshot,
  combineBounds,
  copyImageToClipboard,
} from "../../utils/capture-screenshot.js";
import { isScreenshotSupported } from "../../utils/is-screenshot-supported.js";
import { delay } from "../../utils/delay.js";

export const screenshotPlugin: Plugin = {
  name: "screenshot",
  actions: [
    {
      id: "screenshot",
      label: "Screenshot",
      shortcut: "S",
      enabled: () => isScreenshotSupported(),
      onAction: async (context) => {
        const elementBoundsList = context.elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height,
          };
        });

        const captureBounds = combineBounds(elementBoundsList);
        if (captureBounds.width === 0 || captureBounds.height === 0) return;

        await context.performWithFeedback(async () => {
          context.hideOverlay();
          await delay(SCREENSHOT_CAPTURE_DELAY_MS);

          try {
            const capturedBlob = await captureElementScreenshot(captureBounds);
            const transformedBlob = await context.hooks.transformScreenshot(
              capturedBlob,
              context.elements,
              captureBounds,
            );
            return await copyImageToClipboard(transformedBlob);
          } finally {
            context.showOverlay();
          }
        });
      },
    },
  ],
};
