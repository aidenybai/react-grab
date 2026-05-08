import type { OverlayBounds, Position } from "../types.js";
import {
  SHIFT_SELECTION_LABEL_FALLBACK_ANCHOR_RATIO,
  SHIFT_SELECTION_LABEL_MAX_ANCHOR_RATIO,
  SHIFT_SELECTION_LABEL_MIN_ANCHOR_RATIO,
} from "../constants.js";
import { clampToRange } from "./clamp-to-range.js";

export const getElementAnchorRatio = (bounds: OverlayBounds, pointer: Position): number => {
  if (bounds.width <= 0) return SHIFT_SELECTION_LABEL_FALLBACK_ANCHOR_RATIO;

  return clampToRange(
    (pointer.x - bounds.x) / bounds.width,
    SHIFT_SELECTION_LABEL_MIN_ANCHOR_RATIO,
    SHIFT_SELECTION_LABEL_MAX_ANCHOR_RATIO,
  );
};
