import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";
import { elementToPngBlob } from "../../utils/snapshot/snapshot-html-to-png.js";
import { copyPngToClipboard } from "../../utils/snapshot/copy-png-to-clipboard.js";

export const copySnapshotPlugin = createPendingSelectionPlugin({
  name: "copy-snapshot",
  contextMenuAction: () => ({
    id: "copy-snapshot",
    label: "Copy snapshot",
    showInToolbarMenu: true,
    onAction: async (context) => {
      await context.performWithFeedback(async () => {
        const pngBlob = await elementToPngBlob(context.element);
        return copyPngToClipboard(pngBlob);
      });
    },
  }),
});
