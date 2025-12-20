import type { Setter } from "solid-js";
import type {
  OverlayBounds,
  SelectionLabelInstance,
  SelectionLabelStatus,
} from "../types.js";

export interface LabelInstancesManager {
  createLabelInstance: (
    bounds: OverlayBounds,
    tagName: string,
    componentName: string | undefined,
    status: SelectionLabelStatus,
    element?: Element,
    mouseX?: number,
  ) => string;
  updateLabelInstance: (
    instanceId: string,
    status: SelectionLabelStatus,
  ) => void;
  removeLabelInstance: (instanceId: string) => void;
}

export const createLabelInstancesManager = (
  setLabelInstances: Setter<SelectionLabelInstance[]>,
): LabelInstancesManager => {
  const createLabelInstance: LabelInstancesManager["createLabelInstance"] = (
    bounds,
    tagName,
    componentName,
    status,
    element,
    mouseX,
  ) => {
    const instanceId = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setLabelInstances((previousInstances) => [
      ...previousInstances,
      {
        id: instanceId,
        bounds,
        tagName,
        componentName,
        status,
        createdAt: Date.now(),
        element,
        mouseX,
      },
    ]);

    return instanceId;
  };

  const updateLabelInstance: LabelInstancesManager["updateLabelInstance"] = (
    instanceId,
    status,
  ) => {
    setLabelInstances((previousInstances) =>
      previousInstances.map((instance) =>
        instance.id === instanceId ? { ...instance, status } : instance,
      ),
    );
  };

  const removeLabelInstance: LabelInstancesManager["removeLabelInstance"] = (
    instanceId,
  ) => {
    setLabelInstances((previousInstances) =>
      previousInstances.filter((instance) => instance.id !== instanceId),
    );
  };

  return { createLabelInstance, updateLabelInstance, removeLabelInstance };
};


