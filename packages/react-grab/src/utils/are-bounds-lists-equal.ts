import type { OverlayBounds } from "../types.js";
import { areBoundsEqual } from "./are-bounds-equal.js";

export const areBoundsListsEqual = (
  a: OverlayBounds[] | undefined,
  b: OverlayBounds[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (!areBoundsEqual(a[index], b[index])) return false;
  }
  return true;
};
