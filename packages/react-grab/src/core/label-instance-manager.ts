import { type Accessor, createMemo } from "solid-js";
import { FADE_COMPLETE_BUFFER_MS, FEEDBACK_DURATION_MS } from "../constants.js";
import { combineBounds } from "../utils/combine-bounds.js";
import { createFlatOverlayBounds } from "../utils/create-bounds-from-drag-rect.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { generateId } from "../utils/generate-id.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import type { GrabbedBox, OverlayBounds, SelectionLabelInstance } from "../types.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface CreateLabelInstanceOptions {
  element?: Element;
  mouseX?: number;
  elements?: Element[];
  boundsMultiple?: OverlayBounds[];
  hideArrow?: boolean;
}

interface PerElementLabelEntry {
  element: Element;
  tagName: string;
  componentName?: string;
  mouseX?: number;
}

export interface LabelInstanceManager {
  /** Show a transient "grabbed" flash box; auto-removes after FEEDBACK_DURATION_MS. */
  showTemporaryGrabbedBox: (bounds: OverlayBounds, element: Element) => void;
  /** Replace any active label with a fresh one and return its id. */
  createLabelInstance: (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelInstance["status"],
    options?: CreateLabelInstanceOptions,
  ) => string;
  /** Replace any active labels with one per element; returns the new ids. */
  createPerElementLabelInstances: (
    entries: PerElementLabelEntry[],
    status: SelectionLabelInstance["status"],
  ) => string[];
  /** Cancel pending fade timers and remove all active labels. */
  clearAllLabels: () => void;
  /** Transition a label to "copied" (or "error") and schedule its fade-out. */
  updateLabelAfterCopy: (
    labelInstanceId: string,
    didSucceed: boolean,
    errorMessage?: string,
  ) => void;
  /** Cancel the fade while hovered; reschedule it on un-hover for "copied" labels. */
  handleLabelInstanceHoverChange: (instanceId: string, isHovered: boolean) => void;
  /**
   * Renderer-facing accessor: label instances with their bounds re-projected
   * against the live element positions (so they follow scroll/resize/etc.).
   * Returns the same instance reference when nothing changed so downstream
   * `<Index each>` can dedupe.
   */
  computedLabelInstances: Accessor<SelectionLabelInstance[]>;
  /** Renderer-facing accessor: grabbed boxes with re-projected element bounds. */
  computedGrabbedBoxes: Accessor<GrabbedBox[]>;
  /** Tear down all pending timers; safe to call multiple times. */
  dispose: () => void;
}

const computeMouseXOffsets = (bounds: OverlayBounds, mouseX: number | undefined) => {
  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsHalfWidth = bounds.width / 2;
  const mouseXOffset = mouseX !== undefined ? mouseX - boundsCenterX : undefined;
  return {
    mouseXOffsetFromCenter: mouseXOffset,
    mouseXOffsetRatio:
      mouseXOffset !== undefined && boundsHalfWidth > 0
        ? mouseXOffset / boundsHalfWidth
        : undefined,
  };
};

interface LabelInstanceManagerInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  /** Theme master switch; both computed accessors gate on this. */
  isThemeEnabled: Accessor<boolean>;
  /** grabbedBoxes/labels theme switch; gates both computed accessors. */
  isGrabbedBoxesThemeEnabled: Accessor<boolean>;
}

export const createLabelInstanceManager = (
  input: LabelInstanceManagerInput,
): LabelInstanceManager => {
  const { grab, pluginRegistry, isThemeEnabled, isGrabbedBoxesThemeEnabled } = input;
  const { store, actions, viewportVersion } = grab;
  const grabbedBoxTimeouts = new Map<string, number>();
  const labelFadeTimeouts = new Map<string, number>();

  const showTemporaryGrabbedBox = (bounds: OverlayBounds, element: Element) => {
    const boxId = generateId("grabbed");
    const createdAt = Date.now();
    const newBox: GrabbedBox = { id: boxId, bounds, createdAt, element };

    actions.addGrabbedBox(newBox);
    pluginRegistry.hooks.onGrabbedBox(bounds, element);

    const timeoutId = window.setTimeout(() => {
      grabbedBoxTimeouts.delete(boxId);
      actions.removeGrabbedBox(boxId);
    }, FEEDBACK_DURATION_MS);
    grabbedBoxTimeouts.set(boxId, timeoutId);
  };

  const cancelLabelFade = (instanceId: string) => {
    const existingTimeout = labelFadeTimeouts.get(instanceId);
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout);
      labelFadeTimeouts.delete(instanceId);
    }
  };

  const cancelAllLabelFades = () => {
    for (const timeoutId of labelFadeTimeouts.values()) {
      window.clearTimeout(timeoutId);
    }
    labelFadeTimeouts.clear();
  };

  const scheduleLabelFade = (instanceId: string) => {
    cancelLabelFade(instanceId);

    const timeoutId = window.setTimeout(() => {
      labelFadeTimeouts.delete(instanceId);
      actions.updateLabelInstance(instanceId, "fading");
      setTimeout(() => {
        labelFadeTimeouts.delete(instanceId);
        actions.removeLabelInstance(instanceId);
      }, FADE_COMPLETE_BUFFER_MS);
    }, FEEDBACK_DURATION_MS);

    labelFadeTimeouts.set(instanceId, timeoutId);
  };

  const handleLabelInstanceHoverChange = (instanceId: string, isHovered: boolean) => {
    if (isHovered) {
      cancelLabelFade(instanceId);
      return;
    }
    const instance = store.labelInstances.find(
      (labelInstance) => labelInstance.id === instanceId,
    );
    if (instance && instance.status === "copied") {
      scheduleLabelFade(instanceId);
    }
  };

  const createLabelInstance = (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelInstance["status"],
    options?: CreateLabelInstanceOptions,
  ): string => {
    actions.clearLabelInstances();
    cancelAllLabelFades();
    const instanceId = generateId("label");
    const mouseX = options?.mouseX;
    const offsets = computeMouseXOffsets(bounds, mouseX);

    const instance: SelectionLabelInstance = {
      id: instanceId,
      bounds,
      boundsMultiple: options?.boundsMultiple,
      tagName,
      componentName,
      status,
      createdAt: Date.now(),
      element: options?.element,
      elements: options?.elements,
      mouseX,
      ...offsets,
      hideArrow: options?.hideArrow,
    };
    actions.addLabelInstance(instance);
    return instanceId;
  };

  const createPerElementLabelInstances = (
    entries: PerElementLabelEntry[],
    status: SelectionLabelInstance["status"],
  ): string[] => {
    actions.clearLabelInstances();
    cancelAllLabelFades();
    const instanceIds: string[] = [];
    for (const entry of entries) {
      const bounds = createElementBounds(entry.element);
      const offsets = computeMouseXOffsets(bounds, entry.mouseX);
      const instanceId = generateId("label");
      const instance: SelectionLabelInstance = {
        id: instanceId,
        bounds,
        tagName: entry.tagName,
        componentName: entry.componentName,
        status,
        createdAt: Date.now(),
        element: entry.element,
        mouseX: entry.mouseX,
        ...offsets,
      };
      actions.addLabelInstance(instance);
      instanceIds.push(instanceId);
    }
    return instanceIds;
  };

  const clearAllLabels = () => {
    cancelAllLabelFades();
    actions.clearLabelInstances();
  };

  const updateLabelAfterCopy = (
    labelInstanceId: string,
    didSucceed: boolean,
    errorMessage?: string,
  ) => {
    if (didSucceed) {
      actions.updateLabelInstance(labelInstanceId, "copied");
    } else {
      actions.updateLabelInstance(labelInstanceId, "error", errorMessage || "Unknown error");
    }
    scheduleLabelFade(labelInstanceId);
  };

  const labelInstanceCache = new Map<string, SelectionLabelInstance>();

  const recomputeLabelInstance = (instance: SelectionLabelInstance): SelectionLabelInstance => {
    const liveElements = instance.elements?.filter(isElementConnected) ?? [];
    const instanceElement = instance.element;

    let liveBoundsList: OverlayBounds[] | null = null;
    if (liveElements.length > 0) {
      liveBoundsList = liveElements.map(createElementBounds);
    } else if (instanceElement && isElementConnected(instanceElement)) {
      liveBoundsList = [createElementBounds(instanceElement)];
    }

    let newBounds = instance.bounds;
    let newBoundsMultiple = instance.boundsMultiple;
    if (liveBoundsList) {
      newBounds =
        liveBoundsList.length > 1
          ? createFlatOverlayBounds(combineBounds(liveBoundsList))
          : liveBoundsList[0];
      if (instance.boundsMultiple !== undefined) {
        newBoundsMultiple =
          instance.boundsMultiple.length > 1 &&
          instance.boundsMultiple.length === instance.elements?.length
            ? liveBoundsList
            : [newBounds];
      }
    }

    const previousInstance = labelInstanceCache.get(instance.id);
    const previousBoundsMultiple = previousInstance?.boundsMultiple;
    const boundsMultipleUnchanged =
      previousBoundsMultiple === newBoundsMultiple ||
      (previousBoundsMultiple !== undefined &&
        newBoundsMultiple !== undefined &&
        previousBoundsMultiple.length === newBoundsMultiple.length &&
        previousBoundsMultiple.every(
          (bounds, index) =>
            bounds.x === newBoundsMultiple![index].x &&
            bounds.y === newBoundsMultiple![index].y &&
            bounds.width === newBoundsMultiple![index].width &&
            bounds.height === newBoundsMultiple![index].height,
        ));
    if (
      previousInstance &&
      previousInstance.status === instance.status &&
      previousInstance.errorMessage === instance.errorMessage &&
      previousInstance.bounds.x === newBounds.x &&
      previousInstance.bounds.y === newBounds.y &&
      previousInstance.bounds.width === newBounds.width &&
      previousInstance.bounds.height === newBounds.height &&
      boundsMultipleUnchanged
    ) {
      return previousInstance;
    }
    const newBoundsCenterX = newBounds.x + newBounds.width / 2;
    const newBoundsHalfWidth = newBounds.width / 2;
    let newMouseX: number;
    if (instance.mouseXOffsetRatio !== undefined && newBoundsHalfWidth > 0) {
      newMouseX = newBoundsCenterX + instance.mouseXOffsetRatio * newBoundsHalfWidth;
    } else if (instance.mouseXOffsetFromCenter !== undefined) {
      newMouseX = newBoundsCenterX + instance.mouseXOffsetFromCenter;
    } else {
      newMouseX = instance.mouseX ?? newBoundsCenterX;
    }
    const newCached = {
      ...instance,
      bounds: newBounds,
      boundsMultiple: newBoundsMultiple,
      mouseX: newMouseX,
    };
    labelInstanceCache.set(instance.id, newCached);
    return newCached;
  };

  const computedLabelInstances = createMemo(() => {
    if (!isThemeEnabled()) return [];
    if (!isGrabbedBoxesThemeEnabled()) return [];
    void viewportVersion();
    const currentIds = new Set(store.labelInstances.map((instance) => instance.id));
    for (const cachedId of labelInstanceCache.keys()) {
      if (!currentIds.has(cachedId)) {
        labelInstanceCache.delete(cachedId);
      }
    }
    return store.labelInstances.map(recomputeLabelInstance);
  });

  const computedGrabbedBoxes = createMemo(() => {
    if (!isThemeEnabled()) return [];
    if (!isGrabbedBoxesThemeEnabled()) return [];
    void viewportVersion();
    return store.grabbedBoxes.map((box) => {
      if (!box.element || !document.body.contains(box.element)) {
        return box;
      }
      return {
        ...box,
        bounds: createElementBounds(box.element),
      };
    });
  });

  const dispose = () => {
    for (const timeoutId of grabbedBoxTimeouts.values()) {
      window.clearTimeout(timeoutId);
    }
    grabbedBoxTimeouts.clear();
    cancelAllLabelFades();
  };

  return {
    showTemporaryGrabbedBox,
    createLabelInstance,
    createPerElementLabelInstances,
    clearAllLabels,
    updateLabelAfterCopy,
    handleLabelInstanceHoverChange,
    computedLabelInstances,
    computedGrabbedBoxes,
    dispose,
  };
};

