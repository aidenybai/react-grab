import {
  ARROW_HEIGHT_PX,
  ARROW_MIN_SIZE_PX,
  ARROW_MAX_LABEL_WIDTH_RATIO,
} from "../constants.js";

export const getArrowSize = (labelWidth: number): number => {
  if (labelWidth <= 0) return ARROW_HEIGHT_PX;
  const scaledSize = labelWidth * ARROW_MAX_LABEL_WIDTH_RATIO;
  return Math.max(ARROW_MIN_SIZE_PX, Math.min(ARROW_HEIGHT_PX, scaledSize));
};
