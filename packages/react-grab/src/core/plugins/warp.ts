import type { Plugin, WarpPluginOptions } from "../../types.js";
import { buildWarpUri } from "../../utils/build-warp-uri.js";

export const createWarpPlugin = (options: WarpPluginOptions = {}): Plugin => ({
  name: "warp",
  actions: [
    {
      id: "warp",
      label: "Warp",
      shortcut: "W",
      showInToolbarMenu: true,
      onAction: (context) => {
        context.copy?.();
        window.location.href = buildWarpUri(options);
      },
    },
  ],
});

export const warpPlugin = createWarpPlugin();
