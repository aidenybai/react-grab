import type { GrabbedBox, OverlayBounds } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { createTextNodeBounds } from "./create-text-node-bounds.js";
import { isElementConnected } from "./is-element-connected.js";

export const createGrabbedBoxBounds = (box: GrabbedBox): OverlayBounds => {
  if (box.textNode?.isConnected) {
    return createTextNodeBounds(box.textNode);
  }
  if (isElementConnected(box.element)) {
    return createElementBounds(box.element);
  }
  return box.bounds;
};
