import {
  getFiberFromHostInstance,
  getLatestFiber,
  instrument,
  type Fiber,
  type FiberRoot,
} from "bippy";
import type { OverlayBounds } from "../types.js";
import {
  THREE_PREVIEW_ARRAY_MAX_LENGTH,
  THREE_SELECTION_FALLBACK_BOUNDS_PX,
} from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { registerRendererFreeze } from "../utils/freeze-renderers.js";
import { registerElementAdapter } from "./element-adapter.js";

interface ThreeVectorLike {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => ThreeVectorLike;
  clone: () => ThreeVectorLike;
  applyMatrix4: (matrix: ThreeMatrixLike) => ThreeVectorLike;
  project: (camera: ThreeCameraLike) => ThreeVectorLike;
}

interface ThreeMatrixLike {
  clone: () => ThreeMatrixLike;
  premultiply: (matrix: ThreeMatrixLike) => ThreeMatrixLike;
}

interface ThreeBoxLike {
  min: ThreeVectorLike;
  max: ThreeVectorLike;
}

interface ThreeGeometryLike {
  boundingBox: ThreeBoxLike | null;
  computeBoundingBox: () => void;
}

interface ThreeCameraLike {
  isCamera: boolean;
}

interface ReactThreeFiberInstanceLike {
  type: string;
  props: Record<string, unknown>;
  object: ThreeObjectLike;
  eventCount?: number;
}

interface ThreeObjectLike {
  isObject3D: boolean;
  isScene?: boolean;
  uuid: string;
  name: string;
  type: string;
  visible: boolean;
  parent: ThreeObjectLike | null;
  geometry?: ThreeGeometryLike;
  matrixWorld: ThreeMatrixLike;
  updateWorldMatrix: (updateParents: boolean, updateChildren: boolean) => void;
  getMatrixAt?: (instanceId: number, matrix: ThreeMatrixLike) => void;
  children?: ThreeObjectLike[];
  __r3f?: ReactThreeFiberInstanceLike;
}

interface ThreeIntersectionLike {
  object: ThreeObjectLike;
  point?: ThreeVectorLike;
  instanceId?: number;
}

interface ThreePointerLike {
  set: (x: number, y: number) => void;
}

interface ThreeRaycasterLike {
  setFromCamera: (pointer: ThreePointerLike, camera: ThreeCameraLike) => void;
  intersectObjects: (objects: ThreeObjectLike[], recursive: boolean) => ThreeIntersectionLike[];
}

interface ThreeRendererLike {
  domElement: HTMLCanvasElement;
}

interface ThreeClockLike {
  elapsedTime: number;
}

interface ThreeSceneLike extends ThreeObjectLike {
  isScene: boolean;
  children: ThreeObjectLike[];
}

interface ThreeRootState {
  clock?: unknown;
  gl: ThreeRendererLike;
  scene: ThreeSceneLike;
  camera: ThreeCameraLike;
  raycaster: ThreeRaycasterLike;
  pointer: ThreePointerLike;
  frameloop?: unknown;
  setFrameloop?: unknown;
}

export interface ThreeSceneRegistration {
  camera: object;
  pointer: object;
  raycaster: object;
  renderer: object;
  rendering?: ThreeSceneRenderingControls;
  scene: object;
}

export interface ThreeSceneRenderingControls {
  freeze: () => void;
  unfreeze: () => void;
}

interface ThreeRoot {
  freezeRendering: (() => void) | null;
  getState: () => ThreeRootState;
  isReactThreeFiber: boolean;
  unfreezeRendering: (() => void) | null;
}

interface ThreeSelection {
  canvas: HTMLCanvasElement;
  element: Element;
  fiber: Fiber | null;
  instance: ReactThreeFiberInstanceLike | null;
  instanceId: number | null;
  intersectionPoint: ThreeVectorLike | null;
  object: ThreeObjectLike;
  rootState: ThreeRootState;
  tagName: string;
}

const selectionsByObject = new WeakMap<ThreeObjectLike, Map<number | null, ThreeSelection>>();
const threeRootByCanvas = new WeakMap<HTMLCanvasElement, ThreeRoot>();
const rendererFreezeCleanupByCanvas = new WeakMap<HTMLCanvasElement, () => void>();
const THREE_PREVIEW_PROP_NAMES = [
  "name",
  "position",
  "rotation",
  "scale",
  "color",
  "visible",
  "args",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isObjectOrFunction = (value: unknown): value is object =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const hasFunction = (value: Record<string, unknown>, propertyName: string): boolean =>
  typeof value[propertyName] === "function";

const isThreeVector = (value: unknown): value is ThreeVectorLike =>
  isRecord(value) &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.z === "number" &&
  hasFunction(value, "set") &&
  hasFunction(value, "clone") &&
  hasFunction(value, "applyMatrix4") &&
  hasFunction(value, "project");

const isThreeMatrix = (value: unknown): value is ThreeMatrixLike =>
  isRecord(value) && hasFunction(value, "clone") && hasFunction(value, "premultiply");

const isThreeGeometry = (value: unknown): value is ThreeGeometryLike =>
  isRecord(value) && "boundingBox" in value && hasFunction(value, "computeBoundingBox");

const isReactThreeFiberInstance = (value: unknown): value is ReactThreeFiberInstanceLike =>
  isRecord(value) &&
  typeof value.type === "string" &&
  isRecord(value.props) &&
  isThreeObject(value.object);

const isThreeObject = (value: unknown): value is ThreeObjectLike =>
  isRecord(value) &&
  value.isObject3D === true &&
  typeof value.uuid === "string" &&
  typeof value.name === "string" &&
  typeof value.type === "string" &&
  typeof value.visible === "boolean" &&
  isThreeMatrix(value.matrixWorld) &&
  hasFunction(value, "updateWorldMatrix");

const isThreeCamera = (value: unknown): value is ThreeCameraLike =>
  isRecord(value) && value.isCamera === true;

const isThreeScene = (value: unknown): value is ThreeSceneLike =>
  isThreeObject(value) && value.isScene === true && Array.isArray(value.children);

const isCanvasElement = (value: unknown): value is HTMLCanvasElement =>
  isRecord(value) &&
  typeof value.tagName === "string" &&
  value.tagName.toLowerCase() === "canvas" &&
  hasFunction(value, "getContext");

const isThreeRenderer = (value: unknown): value is ThreeRendererLike =>
  isRecord(value) && isCanvasElement(value.domElement);

const isThreePointer = (value: unknown): value is ThreePointerLike =>
  isRecord(value) && hasFunction(value, "set");

const isThreeRaycaster = (value: unknown): value is ThreeRaycasterLike =>
  isRecord(value) && hasFunction(value, "setFromCamera") && hasFunction(value, "intersectObjects");

const isThreeRootState = (value: unknown): value is ThreeRootState =>
  isRecord(value) &&
  isThreeRenderer(value.gl) &&
  isThreeScene(value.scene) &&
  isThreeCamera(value.camera) &&
  isThreeRaycaster(value.raycaster) &&
  isThreePointer(value.pointer);

const isThreeFrameloop = (value: unknown): value is "always" | "demand" | "never" =>
  value === "always" || value === "demand" || value === "never";

const isThreeClock = (value: unknown): value is ThreeClockLike =>
  isRecord(value) && typeof value.elapsedTime === "number";

const setThreeFrameloop = (root: ThreeRoot, frameloop: "always" | "demand" | "never"): void => {
  const state = root.getState();
  if (typeof state.setFrameloop !== "function") return;
  const elapsedTime = isThreeClock(state.clock) ? state.clock.elapsedTime : null;
  state.setFrameloop(frameloop);
  const currentClock = root.getState().clock;
  if (elapsedTime !== null && isThreeClock(currentClock)) {
    currentClock.elapsedTime = elapsedTime;
  }
};

const registerThreeRendererFreeze = (canvas: HTMLCanvasElement): void => {
  if (rendererFreezeCleanupByCanvas.has(canvas)) return;
  let restoreRendering: (() => void) | null = null;

  const unregisterRendererFreeze = registerRendererFreeze({
    freeze: () => {
      const root = threeRootByCanvas.get(canvas);
      if (!root) return;
      const state = root.getState();

      if (
        root.isReactThreeFiber &&
        isThreeFrameloop(state.frameloop) &&
        typeof state.setFrameloop === "function"
      ) {
        const previousFrameloop = state.frameloop;
        setThreeFrameloop(root, "never");
        restoreRendering = () => setThreeFrameloop(root, previousFrameloop);
        return;
      }

      if (root.freezeRendering && root.unfreezeRendering) {
        root.freezeRendering();
        restoreRendering = root.unfreezeRendering;
      }
    },
    isConnected: () => canvas.isConnected,
    unfreeze: () => {
      restoreRendering?.();
      restoreRendering = null;
    },
  });
  rendererFreezeCleanupByCanvas.set(canvas, unregisterRendererFreeze);
};

const unregisterThreeRendererFreeze = (canvas: HTMLCanvasElement): void => {
  const cleanup = rendererFreezeCleanupByCanvas.get(canvas);
  if (!cleanup) return;
  cleanup();
  rendererFreezeCleanupByCanvas.delete(canvas);
};

const getReactThreeFiberInstance = (object: ThreeObjectLike): ReactThreeFiberInstanceLike | null =>
  isReactThreeFiberInstance(object.__r3f) ? object.__r3f : null;

const getThreeRootStateAccessor = (root: FiberRoot): (() => ThreeRootState) | null => {
  const stateNode = root.current.stateNode;
  if (!isRecord(stateNode) || !isObjectOrFunction(stateNode.containerInfo)) return null;
  const containerInfo = stateNode.containerInfo;
  const readState = Reflect.get(containerInfo, "getState");
  if (typeof readState !== "function") return null;
  const initialState = Reflect.apply(readState, containerInfo, []);
  if (!isThreeRootState(initialState)) return null;
  return () => {
    const state = Reflect.apply(readState, containerInfo, []);
    return isThreeRootState(state) ? state : initialState;
  };
};

instrument({
  name: "react-grab-three-selection",
  onCommitFiberRoot: (_rendererId, root) => {
    const getRootState = getThreeRootStateAccessor(root);
    if (!getRootState) return;
    const rootState = getRootState();
    const canvas = rootState.gl.domElement;
    if (!canvas.isConnected || !root.current.child) {
      threeRootByCanvas.delete(canvas);
      unregisterThreeRendererFreeze(canvas);
      return;
    }
    threeRootByCanvas.set(canvas, {
      freezeRendering: null,
      getState: getRootState,
      isReactThreeFiber: true,
      unfreezeRendering: null,
    });
    registerThreeRendererFreeze(canvas);
  },
});

const findReactThreeFiberObject = (object: ThreeObjectLike): ThreeObjectLike | null => {
  let currentObject: ThreeObjectLike | null = object;
  while (currentObject) {
    if (getReactThreeFiberInstance(currentObject)) return currentObject;
    currentObject = currentObject.parent;
  }
  return null;
};

const hasReactThreeFiberInteractionIntent = (object: ThreeObjectLike): boolean => {
  let currentObject: ThreeObjectLike | null = object;
  while (currentObject) {
    const instance = getReactThreeFiberInstance(currentObject);
    if (instance && typeof instance.eventCount === "number" && instance.eventCount > 0) {
      return true;
    }
    currentObject = currentObject.parent;
  }
  return false;
};

const isThreeObjectInScene = (object: ThreeObjectLike, scene: ThreeSceneLike): boolean => {
  let currentObject: ThreeObjectLike | null = object;
  while (currentObject) {
    if (currentObject === scene) return true;
    currentObject = currentObject.parent;
  }
  return false;
};

const getOrCreateSelectionElement = (
  rootState: ThreeRootState,
  object: ThreeObjectLike,
  intersection: ThreeIntersectionLike,
): Element | null => {
  const instanceId =
    typeof intersection.instanceId === "number" && Number.isInteger(intersection.instanceId)
      ? intersection.instanceId
      : null;
  let selectionsByInstance = selectionsByObject.get(object);
  if (!selectionsByInstance) {
    selectionsByInstance = new Map();
    selectionsByObject.set(object, selectionsByInstance);
  }

  const existingSelection = selectionsByInstance.get(instanceId);
  if (existingSelection) {
    existingSelection.canvas = rootState.gl.domElement;
    existingSelection.intersectionPoint = isThreeVector(intersection.point)
      ? intersection.point
      : null;
    existingSelection.object = object;
    existingSelection.rootState = rootState;
    return existingSelection.element;
  }

  const instance = getReactThreeFiberInstance(object);
  const fiber = instance ? getFiberFromHostInstance(instance) : null;
  if (instance && !fiber) return null;
  const tagName = (instance?.type || object.type || "object-3d").toLowerCase();
  const createdElement = rootState.gl.domElement.ownerDocument.createElement(tagName);
  const selection: ThreeSelection = {
    canvas: rootState.gl.domElement,
    element: createdElement,
    fiber,
    instance,
    instanceId,
    intersectionPoint: isThreeVector(intersection.point) ? intersection.point : null,
    object,
    rootState,
    tagName,
  };
  const nativeGetBoundingClientRect = createdElement.getBoundingClientRect.bind(createdElement);
  createdElement.getBoundingClientRect = () => {
    const bounds = createThreeSelectionBounds(selection);
    const domRectConstructor = createdElement.ownerDocument.defaultView?.DOMRect;
    if (!domRectConstructor) return nativeGetBoundingClientRect();
    return new domRectConstructor(bounds.x, bounds.y, bounds.width, bounds.height);
  };
  registerElementAdapter(createdElement, {
    hostElement: selection.canvas,
    supportsDomEditing: false,
    getBounds: () => createThreeSelectionBounds(selection),
    getFiber: () => (selection.fiber ? getLatestFiber(selection.fiber) : null),
    getPreview: () => getThreeSelectionPreview(selection),
    getSelector: () => createThreeSelectionSelector(selection),
    getTagName: () => selection.tagName,
    isConnected: () =>
      selection.canvas.isConnected &&
      isThreeObjectInScene(selection.object, selection.rootState.scene),
  });
  selectionsByInstance.set(instanceId, selection);
  return createdElement;
};

export const resolveThreeElementAtPoint = (
  candidateElement: Element,
  clientX: number,
  clientY: number,
): Element => {
  if (!isCanvasElement(candidateElement)) return candidateElement;
  const root = threeRootByCanvas.get(candidateElement);
  if (!root) return candidateElement;
  const rootState = root.getState();

  const canvasBounds = createElementBounds(candidateElement);
  if (canvasBounds.width <= 0 || canvasBounds.height <= 0) return candidateElement;
  const pointerX = ((clientX - canvasBounds.x) / canvasBounds.width) * 2 - 1;
  const pointerY = -((clientY - canvasBounds.y) / canvasBounds.height) * 2 + 1;
  if (pointerX < -1 || pointerX > 1 || pointerY < -1 || pointerY > 1) {
    return candidateElement;
  }

  try {
    rootState.pointer.set(pointerX, pointerY);
    rootState.raycaster.setFromCamera(rootState.pointer, rootState.camera);
    const intersections = rootState.raycaster.intersectObjects(rootState.scene.children, true);
    if (root.isReactThreeFiber) {
      for (const intersection of intersections) {
        if (!hasReactThreeFiberInteractionIntent(intersection.object)) continue;
        const object = findReactThreeFiberObject(intersection.object);
        if (!object || object.visible === false) continue;
        const element = getOrCreateSelectionElement(rootState, object, intersection);
        if (element) return element;
      }
    }
    for (const intersection of intersections) {
      const object = root.isReactThreeFiber
        ? findReactThreeFiberObject(intersection.object)
        : intersection.object;
      if (!object || object.visible === false) continue;
      const element = getOrCreateSelectionElement(rootState, object, intersection);
      if (element) return element;
    }
  } catch {}
  return candidateElement;
};

export const registerThreeScene = (registration: ThreeSceneRegistration): (() => void) => {
  const rootState = {
    gl: registration.renderer,
    scene: registration.scene,
    camera: registration.camera,
    raycaster: registration.raycaster,
    pointer: registration.pointer,
  };
  if (!isThreeRootState(rootState)) {
    throw new TypeError("Invalid Three.js scene registration");
  }
  const canvas = rootState.gl.domElement;
  const rootRegistration = {
    freezeRendering: registration.rendering?.freeze ?? null,
    getState: () => rootState,
    isReactThreeFiber: false,
    unfreezeRendering: registration.rendering?.unfreeze ?? null,
  };
  threeRootByCanvas.set(canvas, rootRegistration);
  registerThreeRendererFreeze(canvas);
  return () => {
    if (threeRootByCanvas.get(canvas) !== rootRegistration) return;
    threeRootByCanvas.delete(canvas);
    unregisterThreeRendererFreeze(canvas);
  };
};

const formatPropValue = (value: unknown): string | null => {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return `{${String(value)}}`;
  if (
    Array.isArray(value) &&
    value.length <= THREE_PREVIEW_ARRAY_MAX_LENGTH &&
    value.every((item) => typeof item === "number" || typeof item === "string")
  ) {
    return `{${JSON.stringify(value)}}`;
  }
  return null;
};

const getThreeSelectionPreview = (selection: ThreeSelection): string => {
  const props = selection.instance?.props ?? {};
  const attributes: string[] = [];

  for (const propName of THREE_PREVIEW_PROP_NAMES) {
    let propValue = props[propName];
    if (propName === "name" && propValue === undefined && selection.object.name) {
      propValue = selection.object.name;
    }
    const formattedValue = formatPropValue(propValue);
    if (formattedValue) attributes.push(`${propName}=${formattedValue}`);
  }
  if (selection.instanceId !== null) attributes.push(`instanceId={${selection.instanceId}}`);
  return `<${selection.tagName}${attributes.length > 0 ? ` ${attributes.join(" ")}` : ""} />`;
};

const createThreeSelectionSelector = (selection: ThreeSelection): string => {
  if (selection.object.name) {
    return `${selection.tagName}[name=${JSON.stringify(selection.object.name)}]`;
  }
  const instanceSuffix = selection.instanceId === null ? "" : `:${selection.instanceId}`;
  return `${selection.tagName}[uuid=${JSON.stringify(`${selection.object.uuid}${instanceSuffix}`)}]`;
};

const getObjectMatrix = (selection: ThreeSelection): ThreeMatrixLike => {
  selection.object.updateWorldMatrix(true, false);
  const worldMatrix = selection.object.matrixWorld.clone();
  if (selection.instanceId === null || !selection.object.getMatrixAt) return worldMatrix;
  const instanceMatrix = selection.object.matrixWorld.clone();
  selection.object.getMatrixAt(selection.instanceId, instanceMatrix);
  return instanceMatrix.premultiply(worldMatrix);
};

const getGeometryBoundingBox = (object: ThreeObjectLike): ThreeBoxLike | null => {
  if (!isThreeGeometry(object.geometry)) return null;
  if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
  const boundingBox = object.geometry.boundingBox;
  if (!boundingBox || !isThreeVector(boundingBox.min) || !isThreeVector(boundingBox.max)) {
    return null;
  }
  return boundingBox;
};

const createFallbackBounds = (
  selection: ThreeSelection,
  canvasBounds: OverlayBounds,
): OverlayBounds => {
  const fallbackSize = THREE_SELECTION_FALLBACK_BOUNDS_PX;
  let centerX = canvasBounds.x + canvasBounds.width / 2;
  let centerY = canvasBounds.y + canvasBounds.height / 2;
  if (selection.intersectionPoint) {
    const projectedPoint = selection.intersectionPoint.clone().project(selection.rootState.camera);
    if (Number.isFinite(projectedPoint.x) && Number.isFinite(projectedPoint.y)) {
      centerX = canvasBounds.x + ((projectedPoint.x + 1) / 2) * canvasBounds.width;
      centerY = canvasBounds.y + ((1 - projectedPoint.y) / 2) * canvasBounds.height;
    }
  }
  return {
    x: centerX - fallbackSize / 2,
    y: centerY - fallbackSize / 2,
    width: fallbackSize,
    height: fallbackSize,
    borderRadius: "0px",
  };
};

const createThreeSelectionBounds = (selection: ThreeSelection): OverlayBounds => {
  const canvasBounds = createElementBounds(selection.canvas);
  const boundingBox = getGeometryBoundingBox(selection.object);
  if (!boundingBox) return createFallbackBounds(selection, canvasBounds);

  const matrix = getObjectMatrix(selection);
  const xValues = [boundingBox.min.x, boundingBox.max.x];
  const yValues = [boundingBox.min.y, boundingBox.max.y];
  const zValues = [boundingBox.min.z, boundingBox.max.z];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const projectedCorner = boundingBox.min.clone();

  for (const xValue of xValues) {
    for (const yValue of yValues) {
      for (const zValue of zValues) {
        projectedCorner
          .set(xValue, yValue, zValue)
          .applyMatrix4(matrix)
          .project(selection.rootState.camera);
        if (!Number.isFinite(projectedCorner.x) || !Number.isFinite(projectedCorner.y)) continue;
        const cornerX = canvasBounds.x + ((projectedCorner.x + 1) / 2) * canvasBounds.width;
        const cornerY = canvasBounds.y + ((1 - projectedCorner.y) / 2) * canvasBounds.height;
        minX = Math.min(minX, cornerX);
        minY = Math.min(minY, cornerY);
        maxX = Math.max(maxX, cornerX);
        maxY = Math.max(maxY, cornerY);
      }
    }
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return createFallbackBounds(selection, canvasBounds);
  }
  const clampedMinX = Math.max(canvasBounds.x, minX);
  const clampedMinY = Math.max(canvasBounds.y, minY);
  const clampedMaxX = Math.min(canvasBounds.x + canvasBounds.width, maxX);
  const clampedMaxY = Math.min(canvasBounds.y + canvasBounds.height, maxY);
  if (clampedMaxX <= clampedMinX || clampedMaxY <= clampedMinY) {
    return createFallbackBounds(selection, canvasBounds);
  }
  return {
    x: clampedMinX,
    y: clampedMinY,
    width: clampedMaxX - clampedMinX,
    height: clampedMaxY - clampedMinY,
    borderRadius: "0px",
  };
};
