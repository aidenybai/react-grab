import type { OverlayBounds } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { getBoundsCenter } from "./get-bounds-center.js";

interface ElementBoundsCenter {
  bounds: OverlayBounds;
  center: { x: number; y: number };
}

export const getElementBoundsCenter = (
  element: Element,
): ElementBoundsCenter => {
  const bounds = createElementBounds(element);
  return { bounds, center: getBoundsCenter(bounds) };
};
