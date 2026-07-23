import {
  _fiberRoots,
  getFiberFromHostInstance,
  getLatestFiber,
  instrument,
  isFiber,
  traverseFiber,
  type Fiber,
} from "bippy";
import type { OverlayBounds } from "../types.js";
import { THREE_SELECTION_FALLBACK_BOUNDS_PX } from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";
import { registerElementAdapter, registerElementPointResolver } from "./element-adapter.js";

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

interface ThreeInstanceLike {
  type: string;
  props: Record<string, unknown>;
  object: ThreeObjectLike;
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
  __r3f?: ThreeInstanceLike;
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

interface ThreeSceneLike extends ThreeObjectLike {
  isScene: boolean;
  children: ThreeObjectLike[];
}

interface ThreeRootState {
  gl: ThreeRendererLike;
  scene: ThreeSceneLike;
  camera: ThreeCameraLike;
  raycaster: ThreeRaycasterLike;
  pointer: ThreePointerLike;
}

export interface ThreeSceneRegistration {
  camera: object;
  pointer: object;
  raycaster: object;
  renderer: object;
  scene: object;
}

interface ThreeRoot {
  fiberRoot: Fiber | null;
  state: ThreeRootState;
}

interface ThreeSelection {
  canvas: HTMLCanvasElement;
  element: Element;
  fiber: Fiber | null;
  instanceId: number | null;
  intersectionPoint: ThreeVectorLike | null;
  object: ThreeObjectLike;
  rootState: ThreeRootState;
}

interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const selectionByElement = new WeakMap<Element, ThreeSelection>();
const elementsByObject = new WeakMap<ThreeObjectLike, Map<number | null, Element>>();
const registeredRootByCanvas = new WeakMap<HTMLCanvasElement, ThreeRootState>();

instrument({ name: "react-grab-three-selection" });

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

const isThreeInstance = (value: unknown): value is ThreeInstanceLike =>
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

const getThreeInstance = (object: ThreeObjectLike): ThreeInstanceLike | null =>
  isThreeInstance(object.__r3f) ? object.__r3f : null;

const getRootState = (root: unknown): ThreeRootState | null => {
  if (!isRecord(root) || !isFiber(root.current)) return null;
  const stateNode = root.current.stateNode;
  if (!isRecord(stateNode) || !isObjectOrFunction(stateNode.containerInfo)) return null;
  const getState = Reflect.get(stateNode.containerInfo, "getState");
  if (typeof getState !== "function") return null;
  const state = getState();
  return isThreeRootState(state) ? state : null;
};

const getCanvasBounds = (canvas: HTMLCanvasElement): CanvasBounds => {
  const rect = canvas.getBoundingClientRect();
  const position = convertClientPositionToTopWindow(
    canvas.ownerDocument.defaultView,
    rect.left,
    rect.top,
  );
  return {
    x: position.x,
    y: position.y,
    width: rect.width * position.scaleX,
    height: rect.height * position.scaleY,
  };
};

const findRootForCanvas = (canvas: HTMLCanvasElement): ThreeRoot | null => {
  const registeredRoot = registeredRootByCanvas.get(canvas);
  if (registeredRoot) return { fiberRoot: null, state: registeredRoot };
  for (const root of _fiberRoots) {
    const state = getRootState(root);
    if (state?.gl.domElement === canvas && isRecord(root) && isFiber(root.current)) {
      return { fiberRoot: root.current, state };
    }
  }
  return null;
};

const findFiberForObject = (fiberRoot: Fiber, object: ThreeObjectLike): Fiber | null => {
  const instance = getThreeInstance(object);
  const rendererFiber = instance ? getFiberFromHostInstance(instance) : null;
  if (rendererFiber) return getLatestFiber(rendererFiber);
  return traverseFiber(fiberRoot, (fiber) => {
    const stateNode = fiber.stateNode;
    return stateNode === instance || (isRecord(stateNode) && stateNode.object === object);
  });
};

const findManagedHitObject = (object: ThreeObjectLike): ThreeObjectLike | null => {
  let currentObject: ThreeObjectLike | null = object;
  while (currentObject) {
    if (getThreeInstance(currentObject)) return currentObject;
    currentObject = currentObject.parent;
  }
  return null;
};

const isObjectInScene = (object: ThreeObjectLike, scene: ThreeSceneLike): boolean => {
  let currentObject: ThreeObjectLike | null = object;
  while (currentObject) {
    if (currentObject === scene) return true;
    currentObject = currentObject.parent;
  }
  return false;
};

const getOrCreateSelectionElement = (
  rootState: ThreeRootState,
  fiberRoot: Fiber | null,
  object: ThreeObjectLike,
  intersection: ThreeIntersectionLike,
): Element | null => {
  const instanceId =
    typeof intersection.instanceId === "number" && Number.isInteger(intersection.instanceId)
      ? intersection.instanceId
      : null;
  let elementsByInstance = elementsByObject.get(object);
  if (!elementsByInstance) {
    elementsByInstance = new Map();
    elementsByObject.set(object, elementsByInstance);
  }

  let element = elementsByInstance.get(instanceId);
  if (!element) {
    const existingElement = elementsByInstance.values().next().value;
    const existingFiber = existingElement ? selectionByElement.get(existingElement)?.fiber : null;
    const fiber = existingFiber ?? (fiberRoot ? findFiberForObject(fiberRoot, object) : null);
    if (fiberRoot && !fiber) return null;

    const instance = getThreeInstance(object);
    const tagName = instance?.type || object.type || "object-3d";
    const createdElement = rootState.gl.domElement.ownerDocument.createElement(
      tagName.toLowerCase(),
    );
    const selection: ThreeSelection = {
      canvas: rootState.gl.domElement,
      element: createdElement,
      fiber,
      instanceId,
      intersectionPoint: isThreeVector(intersection.point) ? intersection.point : null,
      object,
      rootState,
    };
    const nativeGetBoundingClientRect = createdElement.getBoundingClientRect.bind(createdElement);
    createdElement.getBoundingClientRect = () => {
      const bounds = createThreeSelectionBounds(selection);
      const DomRect = createdElement.ownerDocument.defaultView?.DOMRect;
      if (!DomRect) return nativeGetBoundingClientRect();
      return new DomRect(bounds.x, bounds.y, bounds.width, bounds.height);
    };
    registerElementAdapter(createdElement, {
      physicalElement: selection.canvas,
      supportsDomEditing: false,
      getBounds: () => createThreeSelectionBounds(selection),
      getFiber: () => (selection.fiber ? getLatestFiber(selection.fiber) : null),
      getPreview: () => getThreeSelectionPreview(selection),
      getSelector: () => createThreeSelectionSelector(selection),
      getTagName: () => getThreeSelectionTagName(selection),
      isConnected: () =>
        selection.canvas.isConnected &&
        isObjectInScene(selection.object, selection.rootState.scene),
    });
    selectionByElement.set(createdElement, selection);
    element = createdElement;
    elementsByInstance.set(instanceId, element);
    return element;
  }

  const selection = selectionByElement.get(element);
  if (!selection) {
    elementsByInstance.delete(instanceId);
    return getOrCreateSelectionElement(rootState, fiberRoot, object, intersection);
  }
  selection.canvas = rootState.gl.domElement;
  selection.intersectionPoint = isThreeVector(intersection.point) ? intersection.point : null;
  selection.object = object;
  selection.rootState = rootState;
  return element;
};

const getThreeElementAtPoint = (
  candidateElement: Element,
  clientX: number,
  clientY: number,
): Element | null => {
  if (!isCanvasElement(candidateElement)) return null;
  const root = findRootForCanvas(candidateElement);
  if (!root) return null;

  const bounds = getCanvasBounds(candidateElement);
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const pointerX = ((clientX - bounds.x) / bounds.width) * 2 - 1;
  const pointerY = -((clientY - bounds.y) / bounds.height) * 2 + 1;
  if (pointerX < -1 || pointerX > 1 || pointerY < -1 || pointerY > 1) return null;

  try {
    root.state.pointer.set(pointerX, pointerY);
    root.state.raycaster.setFromCamera(root.state.pointer, root.state.camera);
    const intersections = root.state.raycaster.intersectObjects(root.state.scene.children, true);
    for (const intersection of intersections) {
      const object = root.fiberRoot
        ? findManagedHitObject(intersection.object)
        : intersection.object;
      if (!object || object.visible === false) continue;
      const element = getOrCreateSelectionElement(root.state, root.fiberRoot, object, intersection);
      if (element) return element;
    }
  } catch {}
  return null;
};

registerElementPointResolver(getThreeElementAtPoint);

export const registerThreeScene = (registration: ThreeSceneRegistration): (() => void) => {
  const rootStateCandidate = {
    gl: registration.renderer,
    scene: registration.scene,
    camera: registration.camera,
    raycaster: registration.raycaster,
    pointer: registration.pointer,
  };
  if (!isThreeRootState(rootStateCandidate)) {
    throw new TypeError("Invalid Three.js scene registration");
  }
  const canvas = rootStateCandidate.gl.domElement;
  registeredRootByCanvas.set(canvas, rootStateCandidate);
  return () => {
    if (registeredRootByCanvas.get(canvas) === rootStateCandidate) {
      registeredRootByCanvas.delete(canvas);
    }
  };
};

const getThreeSelectionTagName = (selection: ThreeSelection): string =>
  getThreeInstance(selection.object)?.type ?? selection.object.type.toLowerCase();

const formatPropValue = (value: unknown): string | null => {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return `{${String(value)}}`;
  if (
    Array.isArray(value) &&
    value.length <= 4 &&
    value.every((item) => typeof item === "number" || typeof item === "string")
  ) {
    return `{${JSON.stringify(value)}}`;
  }
  return null;
};

const getThreeSelectionPreview = (selection: ThreeSelection): string => {
  const instance = getThreeInstance(selection.object);
  const type = instance?.type ?? selection.object.type.toLowerCase();
  const props = instance?.props ?? {};
  const attributes: string[] = [];
  const propNames = ["name", "position", "rotation", "scale", "color", "visible", "args"];

  for (const propName of propNames) {
    let propValue = props[propName];
    if (propName === "name" && propValue === undefined && selection.object.name) {
      propValue = selection.object.name;
    }
    const formattedValue = formatPropValue(propValue);
    if (formattedValue) attributes.push(`${propName}=${formattedValue}`);
  }
  if (selection.instanceId !== null) attributes.push(`instanceId={${selection.instanceId}}`);
  return `<${type}${attributes.length > 0 ? ` ${attributes.join(" ")}` : ""} />`;
};

const createThreeSelectionSelector = (selection: ThreeSelection): string => {
  const type = getThreeInstance(selection.object)?.type ?? selection.object.type.toLowerCase();
  if (selection.object.name) return `${type}[name=${JSON.stringify(selection.object.name)}]`;
  const instanceSuffix = selection.instanceId === null ? "" : `:${selection.instanceId}`;
  return `${type}[uuid=${JSON.stringify(`${selection.object.uuid}${instanceSuffix}`)}]`;
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
  canvasBounds: CanvasBounds,
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
  const canvasBounds = getCanvasBounds(selection.canvas);
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

  for (const xValue of xValues) {
    for (const yValue of yValues) {
      for (const zValue of zValues) {
        const projectedCorner = boundingBox.min
          .clone()
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

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
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
