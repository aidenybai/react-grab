import { ARROW_HEIGHT_PX, ARROW_MIN_SIZE_PX, ARROW_MAX_LABEL_WIDTH_RATIO } from "../constants.js";

// Round to a pixel-aligned integer so V8 sees a stable Smi return type on
// every call. Without this the early-return branch returns Smi (8) while the
// scaled branch returns a double, which cascades into "not a Smi" deopts on
// `arrowWidth`, `tipPath`, and `Arrow.createRenderEffect.e`. Sub-pixel arrow
// sizes have no perceivable effect in the 4-8 px range.
export const getArrowSize = (labelWidth: number): number => {
  if (labelWidth <= 0) return ARROW_HEIGHT_PX;
  const scaledSize = labelWidth * ARROW_MAX_LABEL_WIDTH_RATIO;
  const clampedSize = Math.max(ARROW_MIN_SIZE_PX, Math.min(ARROW_HEIGHT_PX, scaledSize));
  return Math.round(clampedSize);
};
