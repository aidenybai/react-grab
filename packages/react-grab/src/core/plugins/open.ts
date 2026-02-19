import type { Plugin } from "../../types.js";
import { openFile } from "../../utils/open-file.js";

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

        const wasHandled = context.hooks.onOpenFile(
          context.filePath,
          context.lineNumber,
        );

        if (!wasHandled) {
          openFile(
            context.filePath,
            context.lineNumber,
            context.hooks.transformOpenFileUrl,
          );
        }

        context.hideContextMenu();
        context.cleanup();
      },
    },
  ],
};
