export { init } from "./core.js";
export {
  getStack,
  formatElementInfo,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core.js";
export { generateSnippet } from "./utils/generate-snippet.js";
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
  AgentContext,
  AgentSession,
  AgentProvider,
  AgentSessionStorage,
  AgentOptions,
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
  if (typeof window === "undefined") return globalApi;
  return window.__REACT_GRAB__ ?? globalApi ?? null;
};

export const setGlobalApi = (api: ReactGrabAPI | null): void => {
  globalApi = api;
  if (typeof window !== "undefined") {
    if (api) {
      window.__REACT_GRAB__ = api;
    } else {
      delete window.__REACT_GRAB__;
    }
  }
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
