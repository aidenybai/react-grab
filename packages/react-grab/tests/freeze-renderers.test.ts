import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  freezeRegisteredRenderers,
  registerRendererFreeze,
  unfreezeRegisteredRenderers,
} from "../src/utils/freeze-renderers.js";

const unregisterCallbacks: Array<() => void> = [];

const registerTestRenderer = (calls: string[], name: string, isConnected = true): (() => void) => {
  const unregister = registerRendererFreeze({
    freeze: () => calls.push(`freeze ${name}`),
    isConnected: () => isConnected,
    unfreeze: () => calls.push(`unfreeze ${name}`),
  });
  unregisterCallbacks.push(unregister);
  return unregister;
};

afterEach(() => {
  unfreezeRegisteredRenderers();
  for (const unregister of unregisterCallbacks.splice(0).reverse()) unregister();
});

describe("renderer freezing", () => {
  it("freezes connected renderers and restores them in reverse order", () => {
    const calls: string[] = [];
    registerTestRenderer(calls, "first");
    registerTestRenderer(calls, "second");

    freezeRegisteredRenderers();
    unfreezeRegisteredRenderers();

    expect(calls).toEqual(["freeze first", "freeze second", "unfreeze second", "unfreeze first"]);
  });

  it("freezes a renderer registered during an active freeze", () => {
    const calls: string[] = [];
    freezeRegisteredRenderers();
    registerTestRenderer(calls, "late");

    expect(calls).toEqual(["freeze late"]);
    unfreezeRegisteredRenderers();
    expect(calls).toEqual(["freeze late", "unfreeze late"]);
  });

  it("skips disconnected renderers", () => {
    const calls: string[] = [];
    registerTestRenderer(calls, "detached", false);

    freezeRegisteredRenderers();
    unfreezeRegisteredRenderers();

    expect(calls).toEqual([]);
  });

  it("can freeze again after a renderer fails to unfreeze", () => {
    const calls: string[] = [];
    const unfreezeError = new Error("unfreeze failed");
    let shouldFailUnfreeze = true;
    const unregister = registerRendererFreeze({
      freeze: () => calls.push("freeze failing"),
      isConnected: () => true,
      unfreeze: () => {
        calls.push("unfreeze failing");
        if (shouldFailUnfreeze) {
          shouldFailUnfreeze = false;
          throw unfreezeError;
        }
      },
    });
    unregisterCallbacks.push(unregister);
    registerTestRenderer(calls, "stable");

    freezeRegisteredRenderers();
    expect(() => unfreezeRegisteredRenderers()).toThrow(unfreezeError);
    freezeRegisteredRenderers();
    unfreezeRegisteredRenderers();

    expect(calls).toEqual([
      "freeze failing",
      "freeze stable",
      "unfreeze stable",
      "unfreeze failing",
      "freeze failing",
      "freeze stable",
      "unfreeze stable",
      "unfreeze failing",
    ]);
  });
});
