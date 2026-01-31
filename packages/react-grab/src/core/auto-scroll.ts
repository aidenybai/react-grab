import {
  AUTO_SCROLL_EDGE_THRESHOLD_PX,
  AUTO_SCROLL_SPEED_PX,
} from "../constants.js";

interface AutoScrollDirection {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export const getAutoScrollDirection = (
  clientX: number,
  clientY: number,
): AutoScrollDirection => {
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
  getMousePosition: () => { x: number; y: number },
  shouldContinue: () => boolean,
): AutoScroller => {
  let animationId: number | null = null;

  const scroll = () => {
    if (!shouldContinue()) {
      stop();
      return;
    }

    const position = getMousePosition();
    const direction = getAutoScrollDirection(position.x, position.y);

    if (direction.top) window.scrollBy(0, -AUTO_SCROLL_SPEED_PX);
    if (direction.bottom) window.scrollBy(0, AUTO_SCROLL_SPEED_PX);
    if (direction.left) window.scrollBy(-AUTO_SCROLL_SPEED_PX, 0);
    if (direction.right) window.scrollBy(AUTO_SCROLL_SPEED_PX, 0);

    if (
      direction.top ||
      direction.bottom ||
      direction.left ||
      direction.right
    ) {
      animationId = requestAnimationFrame(scroll);
    } else {
      animationId = null;
    }
  };

  const start = () => {
    scroll();
  };

  const stop = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  const isActive = () => animationId !== null;

  return {
    start,
    stop,
    isActive,
  };
};
