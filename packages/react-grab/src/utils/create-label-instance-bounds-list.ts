import type { OverlayBounds, SelectionLabelInstance } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { createTextNodeBounds } from "./create-text-node-bounds.js";
import { isElementConnected } from "./is-element-connected.js";

export const createLabelInstanceBoundsList = (
  instance: SelectionLabelInstance,
): OverlayBounds[] | null => {
  if (instance.textNode) {
    return instance.textNode.isConnected ? [createTextNodeBounds(instance.textNode)] : null;
  }

  const liveElements = instance.elements?.filter(isElementConnected) ?? [];
  if (liveElements.length > 0) return liveElements.map(createElementBounds);
  if (instance.element && isElementConnected(instance.element)) {
    return [createElementBounds(instance.element)];
  }
  return null;
};
