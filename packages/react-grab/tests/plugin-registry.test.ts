import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vite-plus/test";
import { createNoopApi } from "../src/core/noop-api.js";
import { createPluginRegistry } from "../src/core/plugin-registry.js";
import { PluginHookError, PluginSetupError } from "../src/errors.js";
import type { PluginConfig } from "../src/types.js";

const createElement = (): Element => Object.create(null);

describe("createPluginRegistry", () => {
  it("aggregates every asynchronous element selection result", async () => {
    const registry = createPluginRegistry();
    const firstHook = vi.fn(() => Promise.resolve(true));
    const secondHook = vi.fn(() => Promise.resolve(false));

    registry.register({ name: "first", hooks: { onElementSelect: firstHook } }, createNoopApi());
    registry.register({ name: "second", hooks: { onElementSelect: secondHook } }, createNoopApi());

    const result = registry.hooks.onElementSelect(createElement());

    expect(result.wasIntercepted).toBe(true);
    expect(await result.pendingResult).toBe(false);
    expect(firstHook).toHaveBeenCalledOnce();
    expect(secondHook).toHaveBeenCalledOnce();
  });

  it("turns rejected element selection hooks into failed results", async () => {
    const registry = createPluginRegistry();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rejection = new Error("rejected");

    registry.register(
      {
        name: "rejecting",
        hooks: { onElementSelect: () => Promise.reject(rejection) },
      },
      createNoopApi(),
    );
    const result = registry.hooks.onElementSelect(createElement());

    expect(result.wasIntercepted).toBe(true);
    expect(await result.pendingResult).toBe(false);
    expect(warning).toHaveBeenCalledWith("[react-grab]", expect.any(PluginHookError));
    expect(warning.mock.calls[0]?.[1]).toMatchObject({
      pluginName: "rejecting",
      hookName: "onElementSelect",
      cause: rejection,
    });
    warning.mockRestore();
  });

  it("does not let thrown element selection hooks block defaults", () => {
    const registry = createPluginRegistry();
    const laterHook = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.register(
      {
        name: "throwing",
        hooks: {
          onElementSelect: () => {
            throw new Error("thrown");
          },
        },
      },
      createNoopApi(),
    );
    registry.register({ name: "later", hooks: { onElementSelect: laterHook } }, createNoopApi());

    const result = registry.hooks.onElementSelect(createElement());

    expect(result.wasIntercepted).toBe(false);
    expect(result.pendingResult).toBeUndefined();
    expect(laterHook).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("removes a plugin even when its cleanup throws", () => {
    const registry = createPluginRegistry();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.register(
      {
        name: "failing-cleanup",
        actions: [{ id: "removed", label: "Removed", onAction: () => {} }],
        setup: () => ({
          cleanup: () => {
            throw new Error("cleanup failed");
          },
        }),
      },
      createNoopApi(),
    );

    registry.unregister("failing-cleanup");

    expect(registry.getPluginNames()).toEqual([]);
    expect(registry.store.actions).toEqual([]);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("observes invalid asynchronous cleanup failures", async () => {
    const registry = createPluginRegistry();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config: PluginConfig = { cleanup: () => undefined };
    Reflect.set(config, "cleanup", () => Promise.reject(new Error("cleanup failed")));

    registry.register(
      {
        name: "failing-cleanup",
        setup: () => config,
      },
      createNoopApi(),
    );

    registry.unregister("failing-cleanup");
    await Promise.resolve();

    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("keeps the current plugin when its replacement setup fails", () => {
    const registry = createPluginRegistry();
    const cleanup = vi.fn();
    const setupError = new Error("setup failed");
    registry.register(
      {
        name: "replaceable",
        actions: [{ id: "current", label: "Current", onAction: () => {} }],
        setup: () => ({ cleanup }),
      },
      createNoopApi(),
    );

    let replacementError: unknown;
    try {
      registry.register(
        {
          name: "replaceable",
          setup: () => {
            throw setupError;
          },
        },
        createNoopApi(),
      );
    } catch (error) {
      replacementError = error;
    }
    expect(replacementError).toBeInstanceOf(PluginSetupError);
    expect(replacementError).toMatchObject({
      pluginName: "replaceable",
      cause: setupError,
    });
    expect(registry.getPluginNames()).toEqual(["replaceable"]);
    expect(registry.store.actions.map((action) => action.id)).toEqual(["current"]);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("merges frozen setup config without mutating it", () => {
    const registry = createPluginRegistry();
    const setupConfig = Object.freeze<PluginConfig>({
      actions: [{ id: "setup", label: "Setup", onAction: () => {} }],
    });

    registry.register(
      {
        name: "frozen-config",
        actions: [{ id: "plugin", label: "Plugin", onAction: () => {} }],
        setup: () => setupConfig,
      },
      createNoopApi(),
    );

    expect(registry.store.actions.map((action) => action.id)).toEqual(["plugin", "setup"]);
    expect(setupConfig.actions?.map((action) => action.id)).toEqual(["setup"]);
  });

  it("preserves non-enumerable setup cleanup", () => {
    const registry = createPluginRegistry();
    const cleanup = vi.fn();
    const setupConfig: PluginConfig = {};
    Object.defineProperty(setupConfig, "cleanup", { value: cleanup });

    registry.register(
      { name: "non-enumerable-cleanup", setup: () => setupConfig },
      createNoopApi(),
    );
    registry.unregister("non-enumerable-cleanup");

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("keeps the current plugin when replacement store preparation fails", () => {
    const registry = createPluginRegistry();
    const currentCleanup = vi.fn();
    const replacementCleanup = vi.fn();
    const mergeError = new Error("theme merge failed");
    const invalidTheme = {};
    Object.defineProperty(invalidTheme, "elementLabel", {
      enumerable: true,
      get: () => {
        throw mergeError;
      },
    });
    registry.register(
      {
        name: "replaceable",
        actions: [{ id: "current", label: "Current", onAction: () => {} }],
        setup: () => ({ cleanup: currentCleanup }),
      },
      createNoopApi(),
    );

    expect(() =>
      registry.register(
        {
          name: "replaceable",
          setup: () => ({ cleanup: replacementCleanup, theme: invalidTheme }),
        },
        createNoopApi(),
      ),
    ).toThrow(PluginSetupError);
    expect(registry.getPluginNames()).toEqual(["replaceable"]);
    expect(registry.store.actions.map((action) => action.id)).toEqual(["current"]);
    expect(currentCleanup).not.toHaveBeenCalled();
    expect(replacementCleanup).toHaveBeenCalledOnce();
  });

  it("preserves plugin precedence when replacing by name", () => {
    const registry = createPluginRegistry();
    const api = createNoopApi();
    registry.register(
      {
        name: "first",
        actions: [{ id: "first", label: "First", onAction: () => {} }],
      },
      api,
    );
    registry.register(
      {
        name: "second",
        actions: [{ id: "second", label: "Second", onAction: () => {} }],
      },
      api,
    );

    registry.register(
      {
        name: "first",
        actions: [{ id: "replacement", label: "Replacement", onAction: () => {} }],
      },
      api,
    );
    registry.register(
      {
        name: "third",
        actions: [{ id: "third", label: "Third", onAction: () => {} }],
      },
      api,
    );

    expect(registry.store.actions.map((action) => action.id)).toEqual([
      "replacement",
      "second",
      "third",
    ]);
  });

  it("cleans every plugin when its Solid owner is disposed", () => {
    const firstCleanup = vi.fn(() => {
      throw new Error("cleanup failed");
    });
    const secondCleanup = vi.fn(() => undefined);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ownedRegistry = createRoot((disposeOwner) => {
      const registry = createPluginRegistry();
      registry.register(
        { name: "first", setup: () => ({ cleanup: firstCleanup }) },
        createNoopApi(),
      );
      registry.register(
        { name: "second", setup: () => ({ cleanup: secondCleanup }) },
        createNoopApi(),
      );
      return { registry, disposeOwner };
    });

    ownedRegistry.disposeOwner();

    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();
    expect(ownedRegistry.registry.getPluginNames()).toEqual([]);
    expect(ownedRegistry.registry.store.actions).toEqual([]);
    ownedRegistry.registry.register({ name: "late" }, createNoopApi());
    expect(ownedRegistry.registry.getPluginNames()).toEqual([]);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("isolates asynchronous notification hook failures between plugins", async () => {
    const registry = createPluginRegistry();
    const laterHook = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.register(
      {
        name: "rejecting",
        hooks: { onBeforeCopy: () => Promise.reject(new Error("hook failed")) },
      },
      createNoopApi(),
    );
    registry.register({ name: "later", hooks: { onBeforeCopy: laterHook } }, createNoopApi());

    await registry.hooks.onBeforeCopy([]);

    expect(laterHook).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("preserves transformation results after plugin failures", async () => {
    const registry = createPluginRegistry();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.register(
      {
        name: "first",
        hooks: {
          transformCopyContent: (content) => `${content}-first`,
          transformOpenFileUrl: (url) => `${url}?first`,
        },
      },
      createNoopApi(),
    );
    registry.register(
      {
        name: "throwing",
        hooks: {
          transformCopyContent: () => Promise.reject(new Error("async failure")),
          transformOpenFileUrl: () => {
            throw new Error("sync failure");
          },
        },
      },
      createNoopApi(),
    );
    registry.register(
      {
        name: "last",
        hooks: {
          transformCopyContent: (content) => `${content}-last`,
          transformOpenFileUrl: (url) => `${url}&last`,
        },
      },
      createNoopApi(),
    );

    await expect(registry.hooks.transformCopyContent("content", [])).resolves.toBe(
      "content-first-last",
    );
    expect(registry.hooks.transformOpenFileUrl("file://path", "path")).toBe(
      "file://path?first&last",
    );
    expect(warning).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });

  it("isolates notification hook failures between plugins", () => {
    const registry = createPluginRegistry();
    const laterHook = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.register(
      {
        name: "throwing",
        hooks: {
          onActivate: () => {
            throw new Error("hook failed");
          },
        },
      },
      createNoopApi(),
    );
    registry.register({ name: "later", hooks: { onActivate: laterHook } }, createNoopApi());

    registry.hooks.onActivate();

    expect(laterHook).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("observes asynchronous notification hook failures", async () => {
    const registry = createPluginRegistry();
    const laterHook = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hookError = new Error("hook failed");

    registry.register(
      {
        name: "rejecting",
        hooks: {
          onActivate: async () => {
            throw hookError;
          },
        },
      },
      createNoopApi(),
    );
    registry.register({ name: "later", hooks: { onActivate: laterHook } }, createNoopApi());

    registry.hooks.onActivate();
    await Promise.resolve();

    expect(laterHook).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(
      "[react-grab]",
      expect.objectContaining({
        cause: hookError,
        hookName: "onActivate",
        pluginName: "rejecting",
      }) satisfies Partial<PluginHookError>,
    );
    warning.mockRestore();
  });

  it("uses one plugin snapshot for each hook dispatch", () => {
    const registry = createPluginRegistry();
    const api = createNoopApi();
    const lateHook = vi.fn();
    const registeringHook = vi.fn(() => {
      registry.register({ name: "late", hooks: { onActivate: lateHook } }, api);
    });
    registry.register({ name: "registering", hooks: { onActivate: registeringHook } }, api);

    registry.hooks.onActivate();

    expect(registeringHook).toHaveBeenCalledOnce();
    expect(lateHook).not.toHaveBeenCalled();

    registry.hooks.onActivate();

    expect(lateHook).toHaveBeenCalledOnce();
  });

  it("does not revisit a plugin that replaces itself during dispatch", () => {
    const registry = createPluginRegistry();
    const api = createNoopApi();
    const selfReplacingHook = vi.fn(() => {
      if (selfReplacingHook.mock.calls.length === 1) {
        registry.register(
          { name: "self-replacing", hooks: { onActivate: selfReplacingHook } },
          api,
        );
      }
    });
    registry.register({ name: "self-replacing", hooks: { onActivate: selfReplacingHook } }, api);

    registry.hooks.onActivate();

    expect(selfReplacingHook).toHaveBeenCalledOnce();
  });
});
