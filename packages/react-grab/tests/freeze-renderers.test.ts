import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  freezeRegisteredRenderers,
  registerRendererFreeze,
  unfreezeRegisteredRenderers,
} from "../src/utils/freeze-renderers.js";
import { registerThreeScene } from "../src/core/three-selection.js";

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

const registerTestThreeScene = (
  canvas: object,
  calls: string[],
  name: string,
  unfreezeError?: Error,
): (() => void) =>
  registerThreeScene({
    camera: { isCamera: true },
    pointer: { set: () => undefined },
    raycaster: {
      intersectObjects: () => [],
      setFromCamera: () => undefined,
    },
    renderer: { domElement: canvas },
    rendering: {
      freeze: () => calls.push(`freeze ${name}`),
      unfreeze: () => {
        calls.push(`unfreeze ${name}`);
        if (unfreezeError) throw unfreezeError;
      },
    },
    scene: {
      children: [],
      isObject3D: true,
      isScene: true,
      matrixWorld: {
        clone: () => ({}),
        premultiply: () => ({}),
      },
      name: "",
      type: "Scene",
      updateWorldMatrix: () => undefined,
      uuid: `scene-${name}`,
      visible: true,
    },
  });

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

  it("allows a Three.js canvas to re-register after unregistering fails", () => {
    const calls: string[] = [];
    const canvas = {
      getContext: () => null,
      isConnected: true,
      tagName: "CANVAS",
    };
    const unfreezeError = new Error("unfreeze failed");
    const unregisterFailingScene = registerTestThreeScene(canvas, calls, "failing", unfreezeError);

    freezeRegisteredRenderers();
    expect(() => unregisterFailingScene()).toThrow(unfreezeError);

    const unregisterStableScene = registerTestThreeScene(canvas, calls, "stable");
    unregisterStableScene();
    unfreezeRegisteredRenderers();

    expect(calls).toEqual([
      "freeze failing",
      "unfreeze failing",
      "freeze stable",
      "unfreeze stable",
    ]);
  });
});
