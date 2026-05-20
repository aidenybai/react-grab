interface AnchorBounds {
  x: number;
  width: number;
}

interface MouseXAnchor {
  mouseXOffsetFromCenter?: number;
  mouseXOffsetRatio?: number;
}

interface MouseXAnchorSource extends MouseXAnchor {
  mouseX?: number;
}

export const computeMouseXAnchor = (
  bounds: AnchorBounds,
  mouseX: number | undefined,
): MouseXAnchor => {
  if (mouseX === undefined) return {};
  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsHalfWidth = bounds.width / 2;
  const offsetFromCenter = mouseX - boundsCenterX;
  return {
    mouseXOffsetFromCenter: offsetFromCenter,
    mouseXOffsetRatio: boundsHalfWidth > 0 ? offsetFromCenter / boundsHalfWidth : undefined,
  };
};

export const resolveMouseX = (bounds: AnchorBounds, anchor: MouseXAnchorSource): number => {
  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsHalfWidth = bounds.width / 2;
  if (anchor.mouseXOffsetRatio !== undefined && boundsHalfWidth > 0) {
    return boundsCenterX + anchor.mouseXOffsetRatio * boundsHalfWidth;
  }
  if (anchor.mouseXOffsetFromCenter !== undefined) {
    return boundsCenterX + anchor.mouseXOffsetFromCenter;
  }
  return anchor.mouseX ?? boundsCenterX;
};
