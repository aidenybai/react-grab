import { PluginSetupError } from "./errors.js";
import type { Plugin, ReactGrabAPI } from "./types.js";
import { reportRecoverableError } from "./utils/report-recoverable-error.js";

let globalApi: ReactGrabAPI | null = null;
const pendingPlugins = new Map<string, Plugin>();

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

  if (!api) return;

  for (const [pluginName, plugin] of pendingPlugins) {
    pendingPlugins.delete(pluginName);
    try {
      api.registerPlugin(plugin);
    } catch (error) {
      reportRecoverableError(
        error instanceof PluginSetupError ? error : new PluginSetupError(pluginName, error),
      );
    }
  }
};

export const registerPlugin = (plugin: Plugin): void => {
  const api = getGlobalApi();
  if (api) {
    api.registerPlugin(plugin);
    return;
  }
  pendingPlugins.set(plugin.name, plugin);
};

export const unregisterPlugin = (name: string): void => {
  const api = getGlobalApi();
  if (api) {
    api.unregisterPlugin(name);
    return;
  }
  pendingPlugins.delete(name);
};
