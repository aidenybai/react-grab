export { init } from "./core.js";
export {
  getStack,
  formatStack,
  getHTMLPreview,
  getNearestComponentName,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core.js";
export type {
  Options,
  ReactGrabAPI,
  Theme,
  ReactGrabState,
  RenderType,
  RenderData,
  OverlayBounds,
  GrabbedBox,
  DragRect,
  Rect,
  Position,
  DeepPartial,
  SuccessLabelType,
  ElementLabelVariant,
  InputModeContext,
  SuccessLabelContext,
  CrosshairContext,
  ElementLabelContext,
} from "./types.js";

import { init } from "./core.js";
import type { ReactGrabAPI } from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

let globalApi: ReactGrabAPI | null = null;

export const getGlobalApi = (): ReactGrabAPI | null => {
  return globalApi ?? window.__REACT_GRAB__ ?? null;
};

if (typeof window !== "undefined") {
  if (window.__REACT_GRAB__) {
    globalApi = window.__REACT_GRAB__;
  } else {
    globalApi = init();
    window.__REACT_GRAB__ = globalApi;
    window.dispatchEvent(
      new CustomEvent("react-grab:init", { detail: globalApi }),
    );
  }
}
