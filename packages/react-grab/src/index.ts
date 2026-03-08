export { init } from "./core/index.js";
export {
  getStack,
  formatElementInfo,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core/index.js";
export { commentPlugin } from "./core/plugins/comment.js";
export { openPlugin } from "./core/plugins/open.js";
export { generateSnippet } from "./utils/generate-snippet.js";
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
  DeepPartial,
  ElementLabelVariant,
  PromptModeContext,
  CrosshairContext,
  ElementLabelContext,
  AgentContext,
  AgentSession,
  AgentProvider,
  AgentSessionStorage,
  AgentOptions,
  AgentCompleteResult,
  SettableOptions,
  ActivationMode,
  ContextMenuAction,
  ContextMenuActionContext,
  ToolbarMenuAction,
  PluginAction,
  ActionContext,
  ActionContextHooks,
  Plugin,
  PluginConfig,
  PluginHooks,
} from "./types.js";

import { init } from "./core/index.js";
import type { Plugin, ReactGrabAPI } from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
    __REACT_GRAB_DISABLED__?: boolean;
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

const pendingPlugins: Plugin[] = [];

const flushPendingPlugins = (api: ReactGrabAPI): void => {
  while (pendingPlugins.length > 0) {
    const plugin = pendingPlugins.shift();
    if (plugin) {
      api.registerPlugin(plugin);
    }
  }
};

export const registerPlugin = (plugin: Plugin): void => {
  const api = getGlobalApi();
  if (api) {
    api.registerPlugin(plugin);
    return;
  }
  pendingPlugins.push(plugin);
};

export const unregisterPlugin = (name: string): void => {
  const api = getGlobalApi();
  if (api) {
    api.unregisterPlugin(name);
    return;
  }
  const pendingIndex = pendingPlugins.findIndex(
    (pendingPlugin) => pendingPlugin.name === name,
  );
  if (pendingIndex !== -1) {
    pendingPlugins.splice(pendingIndex, 1);
  }
};

if (typeof window !== "undefined" && !window.__REACT_GRAB_DISABLED__) {
  if (window.__REACT_GRAB__) {
    globalApi = window.__REACT_GRAB__;
  } else {
    globalApi = init();
    window.__REACT_GRAB__ = globalApi;
  }
  flushPendingPlugins(globalApi);
  window.dispatchEvent(
    new CustomEvent("react-grab:init", { detail: globalApi }),
  );
}
