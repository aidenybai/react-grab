import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyPlugin = createPendingSelectionPlugin({
  name: "copy",
  onPendingSelect: (element, api) => {
    api.copyElement(element);
  },
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
