import { createFlagLoaderSnippet } from "./utils/create-flag-loader-snippet.js";
import type { FlagLoaderOptions } from "./utils/create-flag-loader-snippet.js";

export interface ReactGrabVitePluginOptions extends FlagLoaderOptions {
  enabled?: boolean;
  sourcemap?: boolean;
}

export interface ReactGrabHtmlTagDescriptor {
  tag: string;
  children: string;
  injectTo: "head-prepend";
}

export interface ReactGrabUserConfig {
  build?: {
    sourcemap?: boolean | "inline" | "hidden";
  };
}

export interface ReactGrabVitePlugin {
  name: string;
  config: (userConfig: ReactGrabUserConfig) => ReactGrabUserConfig;
  transformIndexHtml: () => ReactGrabHtmlTagDescriptor[];
}

export const reactGrab = (options: ReactGrabVitePluginOptions = {}): ReactGrabVitePlugin => ({
  name: "react-grab",
  config: (userConfig) =>
    options.enabled === false || options.sourcemap === false || userConfig.build?.sourcemap !== undefined
      ? {}
      : { build: { sourcemap: true } },
  transformIndexHtml: () =>
    options.enabled === false
      ? []
      : [
          {
            tag: "script",
            children: createFlagLoaderSnippet(options),
            injectTo: "head-prepend",
          },
        ],
});
