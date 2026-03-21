import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyPlugin = createPendingSelectionPlugin({
  name: "copy",
  contextMenuAction: {
    id: "copy",
    label: "Copy",
    shortcut: "C",
    showInToolbarMenu: true,
    onAction: (context) => {
      context.copy?.();
    },
  },
});
