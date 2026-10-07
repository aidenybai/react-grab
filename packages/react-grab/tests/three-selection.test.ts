import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  getThreeSelectionElements,
  handleReactThreeFiberRootCommit,
  resolveThreeElementAtPoint,
} from "../src/core/three-selection.js";

vi.mock("bippy", () => ({
  getFiberFromHostInstance: vi.fn(() => Object.create(null)),
  getLatestFiber: vi.fn((fiber) => fiber),
  instrument: vi.fn(),
}));

const createMatrix = () => {
  const matrix = Object.create(null);
  Object.assign(matrix, {
    clone: () => createMatrix(),
    premultiply: () => matrix,
  });
  return matrix;
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Three.js drag selection", () => {
  it("replaces a large instanced mesh aggregate with the endpoint instance", () => {
    const ownerWindow = Object.assign(Object.create(null), {
      getComputedStyle: () => ({ borderRadius: "0px" }),
    });
    const ownerDocument = Object.assign(Object.create(null), {
      defaultView: ownerWindow,
      createElement: (tagName: string) =>
        Object.assign(Object.create(null), {
          getBoundingClientRect: () => ({ height: 0, left: 0, top: 0, width: 0 }),
          ownerDocument,
          tagName: tagName.toUpperCase(),
        }),
    });
    const canvasElement = Object.assign(Object.create(null), {
      getBoundingClientRect: () => ({ height: 100, left: 0, top: 0, width: 100 }),
      getContext: () => null,
      isConnected: true,
      ownerDocument,
      tagName: "CANVAS",
    });
    vi.stubGlobal("window", ownerWindow);

    const scene = Object.assign(Object.create(null), {
      children: [],
      isObject3D: true,
      isScene: true,
      matrixWorld: createMatrix(),
      name: "",
      parent: null,
      type: "Scene",
      updateWorldMatrix: () => undefined,
      uuid: "scene",
      visible: true,
    });
    const instancedMesh = Object.assign(Object.create(null), {
      count: 600,
      geometry: { boundingBox: null, computeBoundingBox: () => undefined },
      getMatrixAt: () => undefined,
      isInstancedMesh: true,
      isObject3D: true,
      matrixWorld: createMatrix(),
      name: "instances",
      parent: scene,
      type: "InstancedMesh",
      updateWorldMatrix: () => undefined,
      uuid: "instances",
      visible: true,
    });
    Object.assign(instancedMesh, {
      __r3f: {
        eventCount: 1,
        object: instancedMesh,
        props: {},
        type: "instancedMesh",
      },
    });
    scene.children.push(instancedMesh);

    const rootState = {
      camera: { isCamera: true },
      gl: { domElement: canvasElement },
      pointer: { set: () => undefined },
      raycaster: {
        intersectObjects: () => [{ instanceId: 513, object: instancedMesh }],
        setFromCamera: () => undefined,
      },
      scene,
    };
    const root = {
      current: {
        child: Object.create(null),
        stateNode: {
          containerInfo: {
            getState: () => rootState,
          },
        },
      },
    };

    handleReactThreeFiberRootCommit(root);
    const endpointElement = resolveThreeElementAtPoint(canvasElement, 50, 50);
    const aggregateElements = getThreeSelectionElements(canvasElement);
    const endpointElements = getThreeSelectionElements(canvasElement, endpointElement);

    expect(endpointElement).not.toBe(canvasElement);
    expect(aggregateElements).toHaveLength(1);
    expect(aggregateElements[0]).not.toBe(endpointElement);
    expect(endpointElements).toEqual([endpointElement]);

    Reflect.set(root.current, "child", null);
    handleReactThreeFiberRootCommit(root);
  });
});
