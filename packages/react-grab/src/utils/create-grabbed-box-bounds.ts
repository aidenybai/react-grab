import type { GrabbedBox, OverlayBounds } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { createTextNodeBounds } from "./create-text-node-bounds.js";
import { isElementConnected } from "./is-element-connected.js";

export const createGrabbedBoxBounds = (box: GrabbedBox): OverlayBounds => {
  if (box.textNode) {
    return box.textNode.isConnected ? createTextNodeBounds(box.textNode) : box.bounds;
  }
  if (isElementConnected(box.element)) {
    return createElementBounds(box.element);
  }
  return box.bounds;
};
