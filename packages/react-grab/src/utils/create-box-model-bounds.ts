import type { BoxModelBounds, GapRect, OverlayBounds } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { BOX_MODEL_GAP_THRESHOLD_PX } from "../constants.js";

interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const FLEX_DISPLAYS = new Set(["flex", "inline-flex"]);
const LAYOUT_DISPLAYS = new Set(["flex", "inline-flex", "grid", "inline-grid"]);

const parseSides = (style: CSSStyleDeclaration, property: string): BoxSides => ({
  top: parseFloat(style.getPropertyValue(`${property}-top`)) || 0,
  right: parseFloat(style.getPropertyValue(`${property}-right`)) || 0,
  bottom: parseFloat(style.getPropertyValue(`${property}-bottom`)) || 0,
  left: parseFloat(style.getPropertyValue(`${property}-left`)) || 0,
});

const insetBounds = (
  bounds: OverlayBounds,
  inset: BoxSides,
  borderRadius: string,
): OverlayBounds => ({
  ...bounds,
  x: bounds.x + inset.left,
  y: bounds.y + inset.top,
  width: bounds.width - inset.left - inset.right,
  height: bounds.height - inset.top - inset.bottom,
  borderRadius,
});

const outsetBounds = (
  bounds: OverlayBounds,
  outset: BoxSides,
  borderRadius: string,
): OverlayBounds => ({
  ...bounds,
  x: bounds.x - outset.left,
  y: bounds.y - outset.top,
  width: bounds.width + outset.left + outset.right,
  height: bounds.height + outset.top + outset.bottom,
  borderRadius,
});

const maxSide = (sides: BoxSides): number =>
  Math.max(sides.top, sides.right, sides.bottom, sides.left);

const computeChildGaps = (
  element: Element,
  style: CSSStyleDeclaration,
  contentBounds: OverlayBounds,
): GapRect[] => {
  if (!LAYOUT_DISPLAYS.has(style.display) || element.children.length < 2) {
    return [];
  }

  const isColumn = FLEX_DISPLAYS.has(style.display)
    && (style.flexDirection === "column" || style.flexDirection === "column-reverse");

  const childRects = Array.from(element.children).map((child) =>
    child.getBoundingClientRect(),
  );

  const gaps: GapRect[] = [];
  for (let childIndex = 0; childIndex < childRects.length - 1; childIndex++) {
    const currentRect = childRects[childIndex];
    const nextRect = childRects[childIndex + 1];
    const gapStart = isColumn ? currentRect.bottom : currentRect.right;
    const gapEnd = isColumn ? nextRect.top : nextRect.left;
    const gapSize = gapEnd - gapStart;

    if (gapSize > BOX_MODEL_GAP_THRESHOLD_PX) {
      gaps.push(
        isColumn
          ? { x: contentBounds.x, y: gapStart, width: contentBounds.width, height: gapSize }
          : { x: gapStart, y: contentBounds.y, width: gapSize, height: contentBounds.height },
      );
    }
  }

  return gaps;
};

export const createBoxModelBounds = (element: Element): BoxModelBounds => {
  const borderBounds = createElementBounds(element);
  const style = window.getComputedStyle(element);

  const marginSides = parseSides(style, "margin");
  const paddingSides = parseSides(style, "padding");
  const borderSides = parseSides(style, "border-width");

  const outerRadius = parseFloat(style.borderRadius) || 0;
  const paddingRadius = Math.max(0, outerRadius - maxSide(borderSides));
  const contentRadius = Math.max(0, paddingRadius - maxSide(paddingSides));

  const margin = outsetBounds(borderBounds, marginSides, "0px");
  const padding = insetBounds(borderBounds, borderSides, `${paddingRadius}px`);
  const content = insetBounds(padding, paddingSides, `${contentRadius}px`);
  const gaps = computeChildGaps(element, style, content);

  return { margin, border: borderBounds, padding, content, gaps };
};
