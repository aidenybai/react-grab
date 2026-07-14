export { init } from "./core/index.js";
export {
  getStack,
  formatElementInfo,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core/index.js";
export { commentPlugin } from "./core/plugins/comment.js";
export { openPlugin } from "./core/plugins/open.js";
export { FreezeError } from "./errors.js";
export { generateSnippet } from "./utils/generate-snippet.js";
export { PluginSetupError, ReactGrabError } from "./errors.js";
export type {
  Options,
  ReactGrabAPI,
  SourceInfo,
  Theme,
  ReactGrabState,
  ToolbarState,
  OverlayBounds,
  GrabbedBox,
  DragRect,
  Rect,
  Position,
  DeepPartial,
  ElementLabelVariant,
  PromptModeContext,
  ElementLabelContext,
  AgentContext,
  SettableOptions,
  ActivationMode,
  ContextMenuAction,
  ContextMenuActionContext,
  ActionContext,
  ActionContextHooks,
  Plugin,
  PluginConfig,
  PluginHooks,
  SelectedElementPayload,
  ElementSelectedEventDetail,
} from "./types.js";

import { init } from "./core/index.js";
import { getGlobalApi, setGlobalApi } from "./global-api.js";
import type { ReactGrabAPI } from "./types.js";

export { getGlobalApi, setGlobalApi, registerPlugin, unregisterPlugin } from "./global-api.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
    __REACT_GRAB_DISABLED__?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__REACT_GRAB_DISABLED__) {
  if (window.__REACT_GRAB__) {
    setGlobalApi(window.__REACT_GRAB__);
  } else {
    setGlobalApi(init());
  }
  window.dispatchEvent(new CustomEvent("react-grab:init", { detail: getGlobalApi() }));
}
