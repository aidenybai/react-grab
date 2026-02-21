import type { ActionContextHooks, Plugin } from "../../types.js";
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

const captureAndCopyScreenshot = async (
  elements: Element[],
  transformScreenshot: ActionContextHooks["transformScreenshot"],
) => {
  const captureBounds = getElementBounds(elements);
  if (captureBounds.width === 0 || captureBounds.height === 0) return false;

  await delay(SCREENSHOT_CAPTURE_DELAY_MS);
  const capturedBlob = await captureElementScreenshot(captureBounds);
  const transformedBlob = await transformScreenshot(
    capturedBlob,
    elements,
    captureBounds,
  );
  return await copyImageToClipboard(transformedBlob);
};

export const screenshotPlugin: Plugin = {
  name: "screenshot",
  setup: (api, hooks) => {
    let isPendingSelection = false;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          api.deactivate();
          return captureAndCopyScreenshot([element], hooks.transformScreenshot);
        },
        onDeactivate: () => {
          isPendingSelection = false;
        },
        cancelPendingToolbarActions: () => {
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
              await delay(SCREENSHOT_CAPTURE_DELAY_MS);
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
          shortcut: "S",
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
