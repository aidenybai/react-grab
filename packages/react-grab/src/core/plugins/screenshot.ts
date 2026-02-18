import type { Plugin } from "../../types.js";
import { SCREENSHOT_CAPTURE_DELAY_MS } from "../../constants.js";
import {
  captureElementScreenshot,
  combineBounds,
  copyImageToClipboard,
} from "../../utils/capture-screenshot.js";
import { isScreenshotSupported } from "../../utils/is-screenshot-supported.js";
import { delay } from "../../utils/delay.js";

const getElementBounds = (elements: Element[]) =>
  combineBounds(
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    }),
  );

const captureAndCopyScreenshot = async (elements: Element[]) => {
  const captureBounds = getElementBounds(elements);
  if (captureBounds.width === 0 || captureBounds.height === 0) return false;

  await delay(SCREENSHOT_CAPTURE_DELAY_MS);
  const capturedBlob = await captureElementScreenshot(captureBounds);
  return await copyImageToClipboard(capturedBlob);
};

export const screenshotPlugin: Plugin = {
  name: "screenshot",
  setup: (api) => {
    let isPendingSelection = false;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          api.deactivate();
          captureAndCopyScreenshot([element]);
        },
        onDeactivate: () => {
          isPendingSelection = false;
        },
      },
      actions: [
        {
          id: "screenshot",
          label: "Screenshot",
          shortcut: "S",
          enabled: isScreenshotSupported,
          onAction: async (context) => {
            const captureBounds = getElementBounds(context.elements);
            if (captureBounds.width === 0 || captureBounds.height === 0) return;

            await context.performWithFeedback(async () => {
              context.hideOverlay();
              try {
                const capturedBlob =
                  await captureElementScreenshot(captureBounds);
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
        {
          id: "screenshot-toolbar",
          label: "Screenshot",
          target: "toolbar",
          enabled: isScreenshotSupported,
          onAction: () => {
            isPendingSelection = true;
            api.activate();
          },
        },
      ],
    };
  },
};
