import type { OverlayBounds } from "../types.js";
import { stripTranslateFromTransform } from "./strip-translate-from-transform.js";

export const createElementBounds = (element: Element): OverlayBounds => {
  const boundingRect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  return {
    borderRadius: computedStyle.borderRadius || "0px",
    height: boundingRect.height,
    transform: stripTranslateFromTransform(element),
    width: boundingRect.width,
    x: boundingRect.left,
    y: boundingRect.top,
  };
};
