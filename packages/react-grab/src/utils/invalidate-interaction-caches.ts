import { invalidateBoundsCache } from "./create-element-bounds.js";
import { clearElementPositionCache } from "./get-element-at-position.js";

// The visibility cache is intentionally NOT cleared here: this runs on every
// scroll/resize event, and clearing it per event forced a getComputedStyle
// storm on every autoscroll frame during drag selection. Scroll/resize don't
// change display/visibility/opacity themselves; style mutations merely
// *driven by* them (scroll handlers toggling classes, media queries on
// resize) are bounded by the cache's TTL — the same staleness bound such
// mutations already have when they fire outside a scroll event.
export const invalidateInteractionCaches = (): void => {
  invalidateBoundsCache();
  clearElementPositionCache();
};
