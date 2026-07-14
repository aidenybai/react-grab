import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createNoopApi } from "../src/core/noop-api.js";
import { PluginSetupError } from "../src/errors.js";
import { getGlobalApi, registerPlugin, setGlobalApi, unregisterPlugin } from "../src/global-api.js";
import type { Plugin, ReactGrabAPI } from "../src/types.js";

const PLUGIN_NAMES = ["first", "second", "failing"];

const createApi = (registerPluginImplementation: ReactGrabAPI["registerPlugin"]): ReactGrabAPI => ({
  ...createNoopApi(),
  registerPlugin: registerPluginImplementation,
});

afterEach(() => {
  setGlobalApi(null);
  for (const pluginName of PLUGIN_NAMES) unregisterPlugin(pluginName);
  vi.restoreAllMocks();
});

describe("global plugin registration", () => {
  it("flushes queued plugins when an API is attached", () => {
    const plugin: Plugin = { name: "first" };
    const apiRegisterPlugin = vi.fn();
    const api = createApi(apiRegisterPlugin);

    registerPlugin(plugin);
    setGlobalApi(api);

    expect(getGlobalApi()).toBe(api);
    expect(apiRegisterPlugin).toHaveBeenCalledWith(plugin);
  });

  it("queues only the latest plugin with each name", () => {
    const firstPlugin: Plugin = { name: "first", actions: [] };
    const replacementPlugin: Plugin = { name: "first", hooks: {} };
    const secondPlugin: Plugin = { name: "second" };
    const apiRegisterPlugin = vi.fn();

    registerPlugin(firstPlugin);
    registerPlugin(secondPlugin);
    registerPlugin(replacementPlugin);
    setGlobalApi(createApi(apiRegisterPlugin));

    expect(apiRegisterPlugin.mock.calls).toEqual([[replacementPlugin], [secondPlugin]]);
  });

  it("fully removes a queued plugin by name", () => {
    const apiRegisterPlugin = vi.fn();

    registerPlugin({ name: "first" });
    registerPlugin({ name: "first", hooks: {} });
    unregisterPlugin("first");
    setGlobalApi(createApi(apiRegisterPlugin));

    expect(apiRegisterPlugin).not.toHaveBeenCalled();
  });

  it("reports a queued setup failure and continues flushing", () => {
    const setupCause = new Error("setup failed");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const apiRegisterPlugin = vi.fn<ReactGrabAPI["registerPlugin"]>((plugin) => {
      if (plugin.name === "failing") throw setupCause;
    });
    const laterPlugin: Plugin = { name: "second" };
    const api = createApi(apiRegisterPlugin);

    registerPlugin({ name: "failing" });
    registerPlugin(laterPlugin);
    setGlobalApi(api);

    expect(getGlobalApi()).toBe(api);
    expect(apiRegisterPlugin).toHaveBeenLastCalledWith(laterPlugin);
    expect(warning).toHaveBeenCalledWith("[react-grab]", expect.any(PluginSetupError));
    expect(warning.mock.calls[0]?.[1]).toMatchObject({
      pluginName: "failing",
      cause: setupCause,
    });
  });
});
