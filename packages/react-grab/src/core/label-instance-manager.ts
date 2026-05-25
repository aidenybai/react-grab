import { FADE_COMPLETE_BUFFER_MS, FEEDBACK_DURATION_MS } from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { generateId } from "../utils/generate-id.js";
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

export const createLabelInstanceManager = (
  grab: GrabStoreHandle,
  pluginRegistry: PluginRegistry,
): LabelInstanceManager => {
  const { store, actions } = grab;
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
    dispose,
  };
};
