import { init } from "./core.js";
import type { ReactGrabAPI } from "./types.js";

let globalApi: ReactGrabAPI | null = null;

export const getGlobalApi = (): ReactGrabAPI | null => globalApi;

globalApi = init();

export { init };
export { playCopySound } from "./utils/play-copy-sound.js";
export type { Options, OverlayBounds, ReactGrabRendererProps, ReactGrabAPI } from "./types.js";
