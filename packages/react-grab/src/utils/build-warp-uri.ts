import type { WarpPluginOptions } from "../types.js";

export const buildWarpUri = (options: WarpPluginOptions): string => {
  const scheme = options.usePreview ? "warppreview" : "warp";

  if (options.launchConfig) {
    return `${scheme}://launch/${encodeURIComponent(options.launchConfig)}`;
  }

  if (options.tabConfig) {
    const newWindowSuffix = options.newWindow ? "?new_window=true" : "";
    return `${scheme}://tab_config/${encodeURIComponent(options.tabConfig)}${newWindowSuffix}`;
  }

  const action = options.newWindow ? "new_window" : "new_tab";
  const pathSuffix = options.path ? `?path=${encodeURIComponent(options.path)}` : "";
  return `${scheme}://action/${action}${pathSuffix}`;
};
