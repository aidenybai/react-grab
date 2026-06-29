import { FADE_COMPLETE_BUFFER_MS, FEEDBACK_DURATION_MS } from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { generateId } from "../utils/generate-id.js";
import type { OverlayBounds, SelectionLabelInstance } from "../types.js";

interface LabelStoreBridge {
  clearLabelInstances: () => void;
  addLabelInstance: (instance: SelectionLabelInstance) => void;
  updateLabelInstance: (
    instanceId: string,
    status: SelectionLabelInstance["status"],
    errorMessage?: string,
  ) => void;
  removeLabelInstance: (instanceId: string) => void;
}

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

interface BuildLabelInstanceOptions {
  bounds: OverlayBounds;
  tagName: string;
  componentName: string | undefined;
  status: SelectionLabelInstance["status"];
  element?: Element;
  mouseX?: number;
  elements?: Element[];
  boundsMultiple?: OverlayBounds[];
  hideArrow?: boolean;
}

interface LabelController {
  createInstance: (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelInstance["status"],
    options?: CreateLabelInstanceOptions,
  ) => string;
  createPerElementInstances: (
    entries: PerElementLabelEntry[],
    status: SelectionLabelInstance["status"],
  ) => string[];
  updateAfterCopy: (instanceId: string, didSucceed: boolean, errorMessage?: string) => void;
  markRetrying: (instanceId: string) => void;
  dismissInstance: (instanceId: string) => void;
  cancelAllFades: () => void;
  clearAll: () => void;
  handleHoverChange: (instanceId: string, isHovered: boolean) => void;
}

const buildLabelInstance = (options: BuildLabelInstanceOptions): SelectionLabelInstance => {
  const boundsCenterX = options.bounds.x + options.bounds.width / 2;
  const boundsHalfWidth = options.bounds.width / 2;
  const mouseXOffset = options.mouseX !== undefined ? options.mouseX - boundsCenterX : undefined;
  return {
    id: generateId("label"),
    bounds: options.bounds,
    boundsMultiple: options.boundsMultiple,
    tagName: options.tagName,
    componentName: options.componentName,
    status: options.status,
    createdAt: Date.now(),
    element: options.element,
    elements: options.elements,
    mouseX: options.mouseX,
    mouseXOffsetFromCenter: mouseXOffset,
    mouseXOffsetRatio:
      mouseXOffset !== undefined && boundsHalfWidth > 0
        ? mouseXOffset / boundsHalfWidth
        : undefined,
    hideArrow: options.hideArrow,
  };
};

export const createLabelController = (
  store: LabelStoreBridge,
  getLabelInstances: () => readonly SelectionLabelInstance[],
): LabelController => {
  const fadeTimeouts = new Map<string, number>();

  const cancelFade = (instanceId: string) => {
    const existingTimeout = fadeTimeouts.get(instanceId);
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout);
      fadeTimeouts.delete(instanceId);
    }
  };

  const cancelAllFades = () => {
    for (const timeoutId of fadeTimeouts.values()) {
      window.clearTimeout(timeoutId);
    }
    fadeTimeouts.clear();
  };

  const clearAll = () => {
    cancelAllFades();
    store.clearLabelInstances();
  };

  const scheduleFade = (instanceId: string) => {
    cancelFade(instanceId);
    const fadeStartTimeoutId = window.setTimeout(() => {
      store.updateLabelInstance(instanceId, "fading");
      const removalTimeoutId = window.setTimeout(() => {
        fadeTimeouts.delete(instanceId);
        store.removeLabelInstance(instanceId);
      }, FADE_COMPLETE_BUFFER_MS);
      fadeTimeouts.set(instanceId, removalTimeoutId);
    }, FEEDBACK_DURATION_MS);
    fadeTimeouts.set(instanceId, fadeStartTimeoutId);
  };

  const createInstance = (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelInstance["status"],
    options?: CreateLabelInstanceOptions,
  ): string => {
    clearAll();
    const instance = buildLabelInstance({
      bounds,
      tagName,
      componentName,
      status,
      element: options?.element,
      mouseX: options?.mouseX,
      elements: options?.elements,
      boundsMultiple: options?.boundsMultiple,
      hideArrow: options?.hideArrow,
    });
    store.addLabelInstance(instance);
    return instance.id;
  };

  const createPerElementInstances = (
    entries: PerElementLabelEntry[],
    status: SelectionLabelInstance["status"],
  ): string[] => {
    clearAll();
    const instanceIds: string[] = [];
    for (const entry of entries) {
      const instance = buildLabelInstance({
        bounds: createElementBounds(entry.element),
        tagName: entry.tagName,
        componentName: entry.componentName,
        status,
        element: entry.element,
        mouseX: entry.mouseX,
      });
      store.addLabelInstance(instance);
      instanceIds.push(instance.id);
    }
    return instanceIds;
  };

  const updateAfterCopy = (instanceId: string, didSucceed: boolean, errorMessage?: string) => {
    if (didSucceed) {
      store.updateLabelInstance(instanceId, "copied");
    } else {
      store.updateLabelInstance(instanceId, "error", errorMessage || "Unknown error");
    }
    scheduleFade(instanceId);
  };

  const markRetrying = (instanceId: string) => {
    cancelFade(instanceId);
    store.updateLabelInstance(instanceId, "copying");
  };

  const dismissInstance = (instanceId: string) => {
    cancelFade(instanceId);
    store.removeLabelInstance(instanceId);
  };

  const handleHoverChange = (instanceId: string, isHovered: boolean) => {
    if (isHovered) {
      cancelFade(instanceId);
      return;
    }
    const instance = getLabelInstances().find((labelInstance) => labelInstance.id === instanceId);
    if (!instance) return;
    if (
      instance.status === "copied" ||
      instance.status === "error" ||
      instance.status === "fading"
    ) {
      scheduleFade(instanceId);
    }
  };

  return {
    createInstance,
    createPerElementInstances,
    updateAfterCopy,
    markRetrying,
    dismissInstance,
    cancelAllFades,
    clearAll,
    handleHoverChange,
  };
};
