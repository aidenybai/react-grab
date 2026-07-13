import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vite-plus/test";
import { createNoopApi } from "../src/core/noop-api.js";
import { createPluginRegistry } from "../src/core/plugin-registry.js";
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

    registry.register(
      {
        name: "rejecting",
        hooks: { onElementSelect: () => Promise.reject(new Error("rejected")) },
      },
      createNoopApi(),
    );
    const result = registry.hooks.onElementSelect(createElement());

    expect(result.wasIntercepted).toBe(true);
    expect(await result.pendingResult).toBe(false);
    expect(warning).toHaveBeenCalledOnce();
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
});
