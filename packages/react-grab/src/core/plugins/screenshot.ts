import { captureNode } from "fast-html-to-image";
import type { Plugin } from "../../types.js";
import { copyImageToClipboard } from "../../utils/copy-image-to-clipboard.js";
import { hasReactGrabAttribute } from "../../utils/is-valid-grabbable-element.js";

export const screenshotPlugin: Plugin = {
  name: "screenshot",
  actions: [
    {
      id: "screenshot",
      label: "Screenshot",
      showInToolbarMenu: true,
      onAction: async (context) => {
        await context.performWithFeedback(() => {
          // The ClipboardItem is constructed before any await so the clipboard
          // write stays inside the user activation window while the capture
          // pipeline runs.
          const pngBlobPromise = captureNode(context.element, {
            bleed: "auto",
            filterNode: (candidateElement) => !hasReactGrabAttribute(candidateElement),
          }).then((captureResult) => captureResult.toBlob());
          return copyImageToClipboard(pngBlobPromise);
        });
      },
    },
  ],
};
