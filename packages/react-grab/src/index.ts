export { init, presets } from "./core/init.js";

export {
  grab,
  config,
  setConfig,
  theme,
  updateTheme,
  isActive,
  isCopying,
  isHolding,
  targetEl,
  pointer,
} from "./core/state.js";

export {
  activate,
  deactivate,
  lock,
  unlock,
  copy,
} from "./core/actions.js";

export {
  addOverlay,
  onBeforeCopy,
  onError,
} from "./core/extend.js";

export { getStack, getNearestComponentName } from "./core/context.js";
export { isInstrumentationActive } from "bippy";
export { DEFAULT_THEME } from "./core/theme.js";
export { generateSnippet } from "./utils/generate-snippet.js";

export type { GrabState, GrabConfig, Position } from "./core/state.js";
export type { InitOptions, PresetConfig } from "./core/init.js";

export type {
  Options,
  ReactGrabAPI,
  Theme,
  ReactGrabState,
  OverlayBounds,
  GrabbedBox,
  DragRect,
  Rect,
  DeepPartial,
  ElementLabelVariant,
  InputModeContext,
  CrosshairContext,
  ElementLabelContext,
  AgentContext,
  AgentSession,
  AgentProvider,
  AgentSessionStorage,
  AgentOptions,
  AgentCompleteResult,
  UpdatableOptions,
  ActivationMode,
} from "./types.js";

import { init } from "./core/init.js";
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
    const cleanup = init();
    if (typeof window !== "undefined" && window.__REACT_GRAB__) {
      globalApi = window.__REACT_GRAB__;
    }
  }
  window.dispatchEvent(
    new CustomEvent("react-grab:init", { detail: globalApi }),
  );
}
