import type { BoxModelBounds, GapRect, OverlayBounds } from "../types.js";
import { createElementBounds } from "./create-element-bounds.js";
import { BOX_MODEL_GAP_THRESHOLD_PX } from "../constants.js";

interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const GRID_DISPLAYS = new Set(["grid", "inline-grid"]);
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

const computeAxisGaps = (
  childRects: DOMRect[],
  contentBounds: OverlayBounds,
  axis: "row" | "column",
): GapRect[] => {
  const sortedRects = [...childRects].sort((a, b) =>
    axis === "column" ? a.top - b.top : a.left - b.left,
  );

  const gaps: GapRect[] = [];
  for (let childIndex = 0; childIndex < sortedRects.length - 1; childIndex++) {
    const gapStart =
      axis === "column" ? sortedRects[childIndex].bottom : sortedRects[childIndex].right;
    const gapEnd =
      axis === "column" ? sortedRects[childIndex + 1].top : sortedRects[childIndex + 1].left;
    const gapSize = gapEnd - gapStart;

    if (gapSize > BOX_MODEL_GAP_THRESHOLD_PX) {
      gaps.push(
        axis === "column"
          ? { x: contentBounds.x, y: gapStart, width: contentBounds.width, height: gapSize }
          : { x: gapStart, y: contentBounds.y, width: gapSize, height: contentBounds.height },
      );
    }
  }

  return gaps;
};

const computeChildGaps = (
  element: Element,
  style: CSSStyleDeclaration,
  contentBounds: OverlayBounds,
): GapRect[] => {
  if (!LAYOUT_DISPLAYS.has(style.display) || element.children.length < 2) {
    return [];
  }

  const childRects = Array.from(element.children).map((child) => child.getBoundingClientRect());

  if (GRID_DISPLAYS.has(style.display)) {
    return [
      ...computeAxisGaps(childRects, contentBounds, "row"),
      ...computeAxisGaps(childRects, contentBounds, "column"),
    ];
  }

  const isColumn = style.flexDirection === "column" || style.flexDirection === "column-reverse";
  return computeAxisGaps(childRects, contentBounds, isColumn ? "column" : "row");
};

export const createBoxModelBounds = (element: Element): BoxModelBounds => {
  const borderBounds = createElementBounds(element);
  const style = window.getComputedStyle(element);

  const marginSides = parseSides(style, "margin");
  const paddingSides = parseSides(style, "padding");
  const borderSides: BoxSides = {
    top: parseFloat(style.borderTopWidth) || 0,
    right: parseFloat(style.borderRightWidth) || 0,
    bottom: parseFloat(style.borderBottomWidth) || 0,
    left: parseFloat(style.borderLeftWidth) || 0,
  };

  const outerRadius = parseFloat(style.borderRadius) || 0;
  const paddingRadius = Math.max(0, outerRadius - maxSide(borderSides));
  const contentRadius = Math.max(0, paddingRadius - maxSide(paddingSides));

  const margin = outsetBounds(borderBounds, marginSides, "0px");
  const padding = insetBounds(borderBounds, borderSides, `${paddingRadius}px`);
  const content = insetBounds(padding, paddingSides, `${contentRadius}px`);
  const gaps = computeChildGaps(element, style, content);

  return { margin, border: borderBounds, padding, content, gaps };
};
