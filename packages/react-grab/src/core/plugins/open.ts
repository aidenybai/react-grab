import type { Plugin } from "../../types.js";
import { executeOpenFileAction } from "../open-file-action.js";

export const openPlugin: Plugin = {
  name: "open",
  actions: [
    {
      id: "open",
      label: "Open",
      shortcut: "O",
      enabled: (context) => Boolean(context.filePath),
      onAction: (context) => {
        if (!context.filePath) return;

        executeOpenFileAction(context.filePath, context.lineNumber, context.hooks);

        context.hideContextMenu();
        context.cleanup();
      },
    },
  ],
};
