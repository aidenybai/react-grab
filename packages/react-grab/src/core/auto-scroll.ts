import type { Position } from "../types.js";
import { AUTO_SCROLL_EDGE_THRESHOLD_PX, AUTO_SCROLL_SPEED_PX } from "../constants.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";

interface AutoScrollDirection {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export const getAutoScrollDirection = (clientX: number, clientY: number): AutoScrollDirection => {
  return {
    top: clientY < AUTO_SCROLL_EDGE_THRESHOLD_PX,
    bottom: clientY > window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX,
    left: clientX < AUTO_SCROLL_EDGE_THRESHOLD_PX,
    right: clientX > window.innerWidth - AUTO_SCROLL_EDGE_THRESHOLD_PX,
  };
};

interface AutoScroller {
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
}

export const createAutoScroller = (
  getMousePosition: () => Position,
  shouldContinue: () => boolean,
  onScrollStep?: (scrollDelta: Position) => void,
): AutoScroller => {
  let animationId: number | null = null;

  const scroll = () => {
    if (!shouldContinue()) {
      stop();
      return;
    }

    const position = getMousePosition();
    const direction = getAutoScrollDirection(position.x, position.y);

    let scrollDeltaX = 0;
    let scrollDeltaY = 0;

    if (direction.top) scrollDeltaY -= AUTO_SCROLL_SPEED_PX;
    if (direction.bottom) scrollDeltaY += AUTO_SCROLL_SPEED_PX;
    if (direction.left) scrollDeltaX -= AUTO_SCROLL_SPEED_PX;
    if (direction.right) scrollDeltaX += AUTO_SCROLL_SPEED_PX;

    if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
      window.scrollBy(scrollDeltaX, scrollDeltaY);
      onScrollStep?.({ x: scrollDeltaX, y: scrollDeltaY });
    }

    if (direction.top || direction.bottom || direction.left || direction.right) {
      animationId = nativeRequestAnimationFrame(scroll);
    } else {
      animationId = null;
    }
  };

  const stop = () => {
    if (animationId !== null) {
      nativeCancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  const isActive = () => animationId !== null;

  return {
    start: scroll,
    stop,
    isActive,
  };
};
