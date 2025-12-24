export { init as initCore } from "./core.js";
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
  VisualEditOptions,
} from "./types.js";

import { init as initCore } from "./core.js";
import { createVisualEditAgentProvider } from "./visual-edit/provider.js";
import type { Options, ReactGrabAPI, VisualEditOptions } from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const attachVisualEdit = (api: ReactGrabAPI, options?: VisualEditOptions) => {
  const { provider, getOptions, onStart, onComplete, onUndo } =
    createVisualEditAgentProvider(options);

  api.setAgent({
    provider,
    getOptions,
    onStart,
    onComplete,
    onUndo,
  });
};

export const init = (options?: Options): ReactGrabAPI => {
  const api = initCore(options);
  if (options?.visualEdit !== false) {
    const visualEditOptions =
      typeof options?.visualEdit === "object" ? options.visualEdit : undefined;
    attachVisualEdit(api, visualEditOptions);
  }
  return api;
};

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
