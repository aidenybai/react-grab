import { init } from "./core.js";
import type { ReactGrabAPI } from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB_EXTENSION_ACTIVE__?: boolean;
  }
}

let globalApi: ReactGrabAPI | null = null;

export const getGlobalApi = (): ReactGrabAPI | null => globalApi;

const EXTENSION_MARKER = "__REACT_GRAB_EXTENSION_ACTIVE__";

if (!window[EXTENSION_MARKER]) {
  globalApi = init();
}

export { init };
export { playCopySound } from "./utils/play-copy-sound.js";
export { htmlToMarkdown, elementToMarkdown } from "./utils/html-to-markdown.js";
export type { Options, OverlayBounds, ReactGrabRendererProps, ReactGrabAPI } from "./types.js";
