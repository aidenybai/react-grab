import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  freezeRegisteredRenderers,
  registerRendererFreeze,
  unfreezeRegisteredRenderers,
} from "../src/utils/freeze-renderers.js";
import { handleReactThreeFiberRootCommit } from "../src/core/three-selection.js";

interface TestThreeFiberRoot {
  current: {
    child: object | null;
    stateNode: object | null;
  };
}

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

  it("unregisters an R3F canvas when its root state becomes unreadable", () => {
    const calls: string[] = [];
    const canvas = {
      getContext: () => null,
      isConnected: true,
      tagName: "CANVAS",
    };
    const rootState = {
      camera: { isCamera: true },
      clock: { elapsedTime: 1 },
      frameloop: "always",
      gl: { domElement: canvas },
      pointer: { set: () => undefined },
      raycaster: {
        intersectObjects: () => [],
        setFromCamera: () => undefined,
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
        uuid: "react-three-fiber-scene",
        visible: true,
      },
      setFrameloop: (frameloop: "always" | "demand" | "never") => {
        calls.push(frameloop);
        rootState.frameloop = frameloop;
      },
    };
    const root: TestThreeFiberRoot = {
      current: {
        child: {},
        stateNode: {
          containerInfo: {
            getState: () => rootState,
          },
        },
      },
    };

    handleReactThreeFiberRootCommit(root);
    freezeRegisteredRenderers();
    expect(calls).toEqual(["never"]);

    root.current.child = null;
    root.current.stateNode = null;
    handleReactThreeFiberRootCommit(root);
    expect(calls).toEqual(["never", "always"]);

    unfreezeRegisteredRenderers();
    expect(calls).toEqual(["never", "always"]);
  });
});
