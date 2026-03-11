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
    onAction: (context) => {
      context.copy?.();
    },
  },
  toolbarAction: {
    id: "copy-toolbar",
    label: "Copy element",
    shortcut: "C",
  },
});
