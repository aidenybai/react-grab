import type { Position } from "../types.js";

export const getCursorQuadrants = (
  cursorX: number,
  cursorY: number,
  elementWidth: number,
  elementHeight: number,
  offset: number,
): Position[] => {
  return [
    {
      left: Math.round(cursorX) + offset,
      top: Math.round(cursorY) + offset,
    },
    {
      left: Math.round(cursorX) - elementWidth - offset,
      top: Math.round(cursorY) + offset,
    },
    {
      left: Math.round(cursorX) + offset,
      top: Math.round(cursorY) - elementHeight - offset,
    },
    {
      left: Math.round(cursorX) - elementWidth - offset,
      top: Math.round(cursorY) - elementHeight - offset,
    },
  ];
};
