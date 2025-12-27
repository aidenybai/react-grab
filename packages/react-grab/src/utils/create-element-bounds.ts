import type { OverlayBounds } from "../types.js";
import { stripTranslateFromTransformString } from "./strip-translate-from-transform.js";

export const createElementBounds = (element: Element): OverlayBounds => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const transform = stripTranslateFromTransformString(style.transform);

  if (transform !== "none" && element instanceof HTMLElement) {
    const ow = element.offsetWidth;
    const oh = element.offsetHeight;

    if (ow > 0 && oh > 0) {
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;

      return {
        borderRadius: style.borderRadius || "0px",
        height: oh,
        transform,
        width: ow,
        x: cx - ow * 0.5,
        y: cy - oh * 0.5,
      };
    }
  }

  return {
    borderRadius: style.borderRadius || "0px",
    height: rect.height,
    transform,
    width: rect.width,
    x: rect.left,
    y: rect.top,
  };
};
