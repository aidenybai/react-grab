import { invalidateBoundsCache } from "./create-element-bounds.js";
import { clearElementPositionCache } from "./get-element-at-position.js";

// The visibility cache is intentionally NOT cleared here: this runs on every
// scroll/resize event, and scrolling never changes display/visibility/opacity.
// Its 50ms TTL already bounds staleness from real style mutations, while
// clearing it per scroll event forced a getComputedStyle storm on every
// autoscroll frame during drag selection.
export const invalidateInteractionCaches = (): void => {
  invalidateBoundsCache();
  clearElementPositionCache();
};
