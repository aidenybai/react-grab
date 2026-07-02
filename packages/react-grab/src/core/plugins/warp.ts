import type { Plugin, WarpPluginOptions } from "../../types.js";
import { buildWarpUri } from "../../utils/build-warp-uri.js";
import { getDirectoryPath } from "../../utils/get-directory-path.js";
import { normalizeFilePath } from "../../utils/normalize-file-path.js";

export const createWarpPlugin = (options: WarpPluginOptions = {}): Plugin => {
  let isAwaitingCopy = false;
  let grabbedDirectoryPath: string | undefined;

  const openWarp = () => {
    window.location.href = buildWarpUri({
      ...options,
      path: options.path ?? grabbedDirectoryPath,
    });
  };

  return {
    name: "warp",
    actions: [
      {
        id: "warp",
        label: "Warp",
        shortcut: "W",
        showInToolbarMenu: true,
        onAction: (context) => {
          grabbedDirectoryPath = context.filePath
            ? getDirectoryPath(normalizeFilePath(context.filePath))
            : undefined;

          if (context.copy) {
            isAwaitingCopy = true;
            context.copy();
          } else {
            openWarp();
          }
        },
      },
    ],
    hooks: {
      onAfterCopy: () => {
        if (!isAwaitingCopy) return;
        isAwaitingCopy = false;
        openWarp();
      },
    },
  };
};

export const warpPlugin = createWarpPlugin();
