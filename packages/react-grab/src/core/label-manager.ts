import type { OverlayBounds, SelectionLabelInstance } from "../types.js";
import { FEEDBACK_DURATION_MS, FADE_COMPLETE_BUFFER_MS } from "../constants.js";
import { generateId } from "../utils/generate-id.js";

interface LabelActions {
  addLabelInstance: (instance: SelectionLabelInstance) => void;
  removeLabelInstance: (instanceId: string) => void;
  updateLabelInstance: (
    instanceId: string,
    status: SelectionLabelInstance["status"],
    errorMessage?: string,
  ) => void;
  clearLabelInstances: () => void;
}

interface LabelStoreReader {
  labelInstances: SelectionLabelInstance[];
}

export interface CreateLabelOptions {
  element?: Element;
  mouseX?: number;
  elements?: Element[];
  boundsMultiple?: OverlayBounds[];
  hideArrow?: boolean;
}

export interface LabelManager {
  create: (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelInstance["status"],
    options?: CreateLabelOptions,
  ) => string;
  remove: (instanceId: string) => void;
  scheduleFade: (instanceId: string) => void;
  cancelFade: (instanceId: string) => void;
  clearAll: () => void;
  handleHoverChange: (instanceId: string, isHovered: boolean) => void;
  dispose: () => void;
}

export const createLabelManager = (
  labelActions: LabelActions,
  storeReader: LabelStoreReader,
): LabelManager => {
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

  const remove = (instanceId: string) => {
    fadeTimeouts.delete(instanceId);
    labelActions.removeLabelInstance(instanceId);
  };

  const scheduleFade = (instanceId: string) => {
    cancelFade(instanceId);

    const timeoutId = window.setTimeout(() => {
      fadeTimeouts.delete(instanceId);
      labelActions.updateLabelInstance(instanceId, "fading");
      setTimeout(() => {
        remove(instanceId);
      }, FADE_COMPLETE_BUFFER_MS);
    }, FEEDBACK_DURATION_MS);

    fadeTimeouts.set(instanceId, timeoutId);
  };

  const handleHoverChange = (instanceId: string, isHovered: boolean) => {
    if (isHovered) {
      cancelFade(instanceId);
    } else {
      const instance = storeReader.labelInstances.find(
        (labelInstance) => labelInstance.id === instanceId,
      );
      if (instance && instance.status === "copied") {
        scheduleFade(instanceId);
      }
    }
  };

  const create = (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelInstance["status"],
    options?: CreateLabelOptions,
  ): string => {
    labelActions.clearLabelInstances();
    cancelAllFades();
    const instanceId = generateId("label");
    const boundsCenterX = bounds.x + bounds.width / 2;
    const boundsHalfWidth = bounds.width / 2;
    const mouseX = options?.mouseX;
    const mouseXOffset =
      mouseX !== undefined ? mouseX - boundsCenterX : undefined;

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
      mouseXOffsetFromCenter: mouseXOffset,
      mouseXOffsetRatio:
        mouseXOffset !== undefined && boundsHalfWidth > 0
          ? mouseXOffset / boundsHalfWidth
          : undefined,
      hideArrow: options?.hideArrow,
    };
    labelActions.addLabelInstance(instance);
    return instanceId;
  };

  const clearAll = () => {
    cancelAllFades();
    labelActions.clearLabelInstances();
  };

  const dispose = () => {
    cancelAllFades();
  };

  return {
    create,
    remove,
    scheduleFade,
    cancelFade,
    clearAll,
    handleHoverChange,
    dispose,
  };
};
