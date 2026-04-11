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
const OUT_OF_FLOW_POSITIONS = new Set(["absolute", "fixed"]);

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

interface CornerRadii {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

const parseCornerRadii = (style: CSSStyleDeclaration): CornerRadii => ({
  topLeft: parseFloat(style.borderTopLeftRadius) || 0,
  topRight: parseFloat(style.borderTopRightRadius) || 0,
  bottomRight: parseFloat(style.borderBottomRightRadius) || 0,
  bottomLeft: parseFloat(style.borderBottomLeftRadius) || 0,
});

const insetCornerRadii = (radii: CornerRadii, sides: BoxSides): CornerRadii => ({
  topLeft: Math.max(0, radii.topLeft - Math.max(sides.top, sides.left)),
  topRight: Math.max(0, radii.topRight - Math.max(sides.top, sides.right)),
  bottomRight: Math.max(0, radii.bottomRight - Math.max(sides.bottom, sides.right)),
  bottomLeft: Math.max(0, radii.bottomLeft - Math.max(sides.bottom, sides.left)),
});

const formatCornerRadii = (radii: CornerRadii): string =>
  `${radii.topLeft}px ${radii.topRight}px ${radii.bottomRight}px ${radii.bottomLeft}px`;

const isInFlowChild = (child: Element): boolean => {
  const childStyle = window.getComputedStyle(child);
  return childStyle.display !== "none" && !OUT_OF_FLOW_POSITIONS.has(childStyle.position);
};

const hasVisibleSize = (rect: DOMRect): boolean => rect.width > 0 || rect.height > 0;

const computeAxisGaps = (
  childRects: DOMRect[],
  contentBounds: OverlayBounds,
  axis: "row" | "column",
): GapRect[] => {
  const isColumnAxis = axis === "column";

  const sortedRects = [...childRects].sort((a, b) =>
    isColumnAxis ? a.top - b.top : a.left - b.left,
  );

  const gaps: GapRect[] = [];
  for (let childIndex = 0; childIndex < sortedRects.length - 1; childIndex++) {
    const currentRect = sortedRects[childIndex];
    const nextRect = sortedRects[childIndex + 1];
    const gapStart = isColumnAxis ? currentRect.bottom : currentRect.right;
    const gapEnd = isColumnAxis ? nextRect.top : nextRect.left;
    const gapSize = gapEnd - gapStart;

    if (gapSize > BOX_MODEL_GAP_THRESHOLD_PX) {
      gaps.push(
        isColumnAxis
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

  const childRects = Array.from(element.children)
    .filter(isInFlowChild)
    .map((child) => child.getBoundingClientRect())
    .filter(hasVisibleSize);

  if (childRects.length < 2) return [];

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

  const outerRadii = parseCornerRadii(style);
  const paddingRadii = insetCornerRadii(outerRadii, borderSides);
  const contentRadii = insetCornerRadii(paddingRadii, paddingSides);

  const margin = outsetBounds(borderBounds, marginSides, "0px");
  const padding = insetBounds(borderBounds, borderSides, formatCornerRadii(paddingRadii));
  const content = insetBounds(padding, paddingSides, formatCornerRadii(contentRadii));
  const gaps = computeChildGaps(element, style, content);

  return { margin, border: borderBounds, padding, content, gaps };
};
