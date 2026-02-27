import type { OverlayBounds } from "../types.js";

export const createTextNodeBounds = (textNode: Text): OverlayBounds => {
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rect = range.getBoundingClientRect();

  return {
    borderRadius: "0px",
    height: rect.height,
    transform: "none",
    width: rect.width,
    x: rect.left,
    y: rect.top,
  };
};
