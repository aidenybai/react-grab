import { invalidateBoundsCache } from "./create-element-bounds.js";
import { clearElementPositionCache } from "./get-element-at-position.js";
import { clearVisibilityCache } from "./is-valid-grabbable-element.js";

export const clearAllCaches = (): void => {
  invalidateBoundsCache();
  clearElementPositionCache();
  clearVisibilityCache();
};
