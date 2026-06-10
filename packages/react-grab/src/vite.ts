import { createFlagLoaderSnippet } from "./utils/create-flag-loader-snippet.js";
import type { FlagLoaderOptions } from "./utils/create-flag-loader-snippet.js";

export interface ReactGrabVitePluginOptions extends FlagLoaderOptions {
  enabled?: boolean;
}

export interface ReactGrabHtmlTagDescriptor {
  tag: string;
  children: string;
  injectTo: "head-prepend";
}

export interface ReactGrabVitePlugin {
  name: string;
  transformIndexHtml: () => ReactGrabHtmlTagDescriptor[];
}

export const reactGrab = (options: ReactGrabVitePluginOptions = {}): ReactGrabVitePlugin => ({
  name: "react-grab",
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
