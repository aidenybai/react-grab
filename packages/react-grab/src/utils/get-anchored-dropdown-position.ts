import type { DropdownAnchor } from "../types.js";
import { clampToViewport } from "./clamp-to-viewport.js";

interface DropdownPosition {
  left: number;
  top: number;
}

interface GetAnchoredDropdownPositionOptions {
  anchor: DropdownAnchor | null;
  measuredWidth: number;
  measuredHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  anchorGapPx: number;
  viewportPaddingPx: number;
  offscreenPosition: DropdownPosition;
}

export const getAnchoredDropdownPosition = ({
  anchor,
  measuredWidth,
  measuredHeight,
  viewportWidth,
  viewportHeight,
  anchorGapPx,
  viewportPaddingPx,
  offscreenPosition,
}: GetAnchoredDropdownPositionOptions): DropdownPosition => {
  if (!anchor || measuredWidth === 0 || measuredHeight === 0) {
    return offscreenPosition;
  }

  let rawLeft: number;
  let rawTop: number;

  if (anchor.edge === "left" || anchor.edge === "right") {
    rawLeft =
      anchor.edge === "left"
        ? anchor.x + anchorGapPx
        : anchor.x - measuredWidth - anchorGapPx;
    rawTop = anchor.y - measuredHeight / 2;
  } else {
    rawLeft = anchor.x - measuredWidth / 2;
    rawTop =
      anchor.edge === "top"
        ? anchor.y + anchorGapPx
        : anchor.y - measuredHeight - anchorGapPx;
  }

  return {
    left: clampToViewport(
      rawLeft,
      measuredWidth,
      viewportWidth,
      viewportPaddingPx,
    ),
    top: clampToViewport(
      rawTop,
      measuredHeight,
      viewportHeight,
      viewportPaddingPx,
    ),
  };
};
