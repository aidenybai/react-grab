import { init } from "./core.js";
import type { ReactGrabAPI } from "./types.js";

let globalApi: ReactGrabAPI | null = null;

export const getGlobalApi = (): ReactGrabAPI | null => globalApi;

globalApi = init();

export { init };
export type { Options, OverlayBounds, ReactGrabRendererProps, ReactGrabAPI } from "./types.js";
