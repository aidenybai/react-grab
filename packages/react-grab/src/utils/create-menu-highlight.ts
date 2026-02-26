interface AnimatedBoundsFollowerOptions {
  hiddenOpacity?: string;
  visibleOpacity?: string;
}

interface AnimatedBoundsFollowerController {
  containerRef: (containerElement: HTMLElement) => void;
  followerRef: (followerElement: HTMLElement) => void;
  followElement: (targetElement: HTMLElement | undefined) => void;
  hideFollower: () => void;
}

interface MenuHighlightController {
  containerRef: (containerElement: HTMLElement) => void;
  highlightRef: (highlightElement: HTMLElement) => void;
  updateHighlight: (targetElement: HTMLElement | undefined) => void;
  clearHighlight: () => void;
}

const DEFAULT_HIDDEN_OPACITY = "0";
const DEFAULT_VISIBLE_OPACITY = "1";

export const createAnimatedBoundsFollower = (
  {
    hiddenOpacity = DEFAULT_HIDDEN_OPACITY,
    visibleOpacity = DEFAULT_VISIBLE_OPACITY,
  }: AnimatedBoundsFollowerOptions = {},
): AnimatedBoundsFollowerController => {
  let containerElement: HTMLElement | undefined;
  let followerElement: HTMLElement | undefined;

  const hideFollower = (): void => {
    if (!followerElement) return;
    followerElement.style.opacity = hiddenOpacity;
  };

  const followElement = (
    targetElement: HTMLElement | undefined,
  ): void => {
    if (!followerElement || !containerElement) return;
    if (!targetElement) {
      hideFollower();
      return;
    }
    const containerRect = containerElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const targetTopWithinContainer =
      targetRect.top - containerRect.top + containerElement.scrollTop;
    const targetLeftWithinContainer =
      targetRect.left - containerRect.left + containerElement.scrollLeft;
    followerElement.style.opacity = visibleOpacity;
    followerElement.style.top = `${targetTopWithinContainer}px`;
    followerElement.style.left = `${targetLeftWithinContainer}px`;
    followerElement.style.width = `${targetRect.width}px`;
    followerElement.style.height = `${targetRect.height}px`;
  };

  const setContainerRef = (containerNode: HTMLElement): void => {
    containerElement = containerNode;
  };

  const setFollowerRef = (followerNode: HTMLElement): void => {
    followerElement = followerNode;
  };

  return {
    containerRef: setContainerRef,
    followerRef: setFollowerRef,
    followElement,
    hideFollower,
  };
};

export const createMenuHighlight = (): MenuHighlightController => {
  const {
    containerRef,
    followerRef: highlightRef,
    followElement: updateHighlight,
    hideFollower: clearHighlight,
  } = createAnimatedBoundsFollower();

  return {
    containerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  };
};
