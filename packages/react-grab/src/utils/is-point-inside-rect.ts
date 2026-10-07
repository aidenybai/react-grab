import type { Rect } from "../types.js";

export const isPointInsideRect = (clientX: number, clientY: number, rect: Rect): boolean =>
  clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
