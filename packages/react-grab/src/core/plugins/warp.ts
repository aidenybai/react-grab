import type { Plugin, WarpPluginOptions } from "../../types.js";
import { buildWarpUri } from "../../utils/build-warp-uri.js";

export const createWarpPlugin = (options: WarpPluginOptions = {}): Plugin => {
  let isAwaitingCopy = false;

  const openWarp = () => {
    window.location.href = buildWarpUri(options);
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
