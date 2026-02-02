import type { Plugin } from "../../types.js";
import { buildOpenFileUrl } from "../../utils/build-open-file-url.js";

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
          const rawUrl = buildOpenFileUrl(
            context.filePath,
            context.lineNumber,
          );
          const url = context.hooks.transformOpenFileUrl(
            rawUrl,
            context.filePath,
            context.lineNumber,
          );
          window.open(url, "_blank", "noopener,noreferrer");
        }

        context.hideContextMenu();
        context.cleanup();
      },
    },
  ],
};
