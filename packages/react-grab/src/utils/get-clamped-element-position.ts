import { VIEWPORT_MARGIN_PX } from "../components/overlay-constants.js";

export const getClampedElementPosition = (
  positionLeft: number,
  positionTop: number,
  elementWidth: number,
  elementHeight: number,
): { left: number; top: number } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const minLeft = VIEWPORT_MARGIN_PX;
  const minTop = VIEWPORT_MARGIN_PX;
  const maxLeft = viewportWidth - elementWidth - VIEWPORT_MARGIN_PX;
  const maxTop = viewportHeight - elementHeight - VIEWPORT_MARGIN_PX;

  const clampedLeft = Math.max(minLeft, Math.min(positionLeft, maxLeft));
  const clampedTop = Math.max(minTop, Math.min(positionTop, maxTop));

  return { left: clampedLeft, top: clampedTop };
};

