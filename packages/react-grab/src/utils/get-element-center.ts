import type { Position } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { getBoundsCenter } from "./get-bounds-center.js";

export const getElementCenter = (element: Element): Position =>
  getBoundsCenter(createElementBounds(element));
