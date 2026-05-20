import type { LabelBoundsSource, OverlayBounds } from "../types.js";
import { combineBounds } from "./combine-bounds.js";
import { createElementBounds } from "./create-element-bounds.js";
import { createFlatOverlayBounds } from "./create-bounds-from-drag-rect.js";
import { isElementConnected } from "./is-element-connected.js";

interface ResolvedBounds {
  bounds: OverlayBounds;
  boundsMultiple?: OverlayBounds[];
}

export const resolveBoundsFromSource = (source: LabelBoundsSource): ResolvedBounds | null => {
  const liveElements = source.elements.filter(isElementConnected);
  if (liveElements.length === 0) return null;

  const liveBoundsList = liveElements.map(createElementBounds);
  const combined =
    liveBoundsList.length > 1
      ? createFlatOverlayBounds(combineBounds(liveBoundsList))
      : liveBoundsList[0];

  return {
    bounds: combined,
    boundsMultiple: source.kind === "per-element" ? liveBoundsList : undefined,
  };
};
