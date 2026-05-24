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

interface MenuHighlightOptions {
  topCornerRadiusPx?: number;
  bottomCornerRadiusPx?: number;
  cornerShape?: string;
}

interface MenuHighlightController {
  containerRef: (containerElement: HTMLElement) => void;
  highlightRef: (highlightElement: HTMLElement) => void;
  updateHighlight: (targetElement: HTMLElement | undefined) => void;
  clearHighlight: () => void;
}

const DEFAULT_HIDDEN_OPACITY = "0";
const DEFAULT_VISIBLE_OPACITY = "1";

const createAnimatedBoundsFollower = ({
  hiddenOpacity = DEFAULT_HIDDEN_OPACITY,
  visibleOpacity = DEFAULT_VISIBLE_OPACITY,
}: AnimatedBoundsFollowerOptions = {}): AnimatedBoundsFollowerController => {
  let containerElement: HTMLElement | undefined;
  let followerElement: HTMLElement | undefined;

  const hideFollower = (): void => {
    if (!followerElement) return;
    followerElement.style.opacity = hiddenOpacity;
  };

  const followElement = (targetElement: HTMLElement | undefined): void => {
    if (!followerElement || !containerElement) return;
    if (!targetElement) {
      hideFollower();
      return;
    }
    // Use offsetTop/Left/Width/Height (layout coords) instead of
    // getBoundingClientRect (visual rect after transforms). When the
    // panel container is mid-transform during its enter animation
    // (e.g. scale(0.92)), the rect width/height reflect the scaled
    // visual size — saving those into the highlight's inline style
    // bakes in the wrong dimensions and the highlight stays narrower
    // than the row when the transform settles to scale(1).
    const targetTopWithinContainer = targetElement.offsetTop - containerElement.scrollTop;
    const targetLeftWithinContainer = targetElement.offsetLeft - containerElement.scrollLeft;
    followerElement.style.opacity = visibleOpacity;
    followerElement.style.top = `${targetTopWithinContainer}px`;
    followerElement.style.left = `${targetLeftWithinContainer}px`;
    followerElement.style.width = `${targetElement.offsetWidth}px`;
    followerElement.style.height = `${targetElement.offsetHeight}px`;
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

const isActionableSibling = (node: Element, follower: HTMLElement | undefined): boolean =>
  node !== follower && node instanceof HTMLElement;

const getActionableSiblings = (
  parent: HTMLElement,
  follower: HTMLElement | undefined,
): HTMLElement[] => {
  const siblings: HTMLElement[] = [];
  for (const child of Array.from(parent.children)) {
    if (isActionableSibling(child, follower)) {
      siblings.push(child as HTMLElement);
    }
  }
  return siblings;
};

export const createMenuHighlight = (
  options: MenuHighlightOptions = {},
): MenuHighlightController => {
  const { topCornerRadiusPx, bottomCornerRadiusPx, cornerShape } = options;
  const hasEdgeRadii = topCornerRadiusPx !== undefined || bottomCornerRadiusPx !== undefined;
  let followerElement: HTMLElement | undefined;
  let didApplyCornerShape = false;

  const applyEdgeRadii = (targetElement: HTMLElement): void => {
    if (!followerElement || !hasEdgeRadii) return;
    const parent = targetElement.parentElement;
    if (!parent) return;
    const siblings = getActionableSiblings(parent, followerElement);
    const isFirst = siblings[0] === targetElement;
    const isLast = siblings[siblings.length - 1] === targetElement;
    const topRadius = isFirst && topCornerRadiusPx !== undefined ? `${topCornerRadiusPx}px` : "0px";
    const bottomRadius =
      isLast && bottomCornerRadiusPx !== undefined ? `${bottomCornerRadiusPx}px` : "0px";
    followerElement.style.borderTopLeftRadius = topRadius;
    followerElement.style.borderTopRightRadius = topRadius;
    followerElement.style.borderBottomLeftRadius = bottomRadius;
    followerElement.style.borderBottomRightRadius = bottomRadius;
    if (cornerShape && !didApplyCornerShape) {
      followerElement.style.setProperty("corner-shape", cornerShape);
      didApplyCornerShape = true;
    }
  };

  const {
    containerRef,
    followerRef: baseFollowerRef,
    followElement: baseFollowElement,
    hideFollower: clearHighlight,
  } = createAnimatedBoundsFollower();

  const highlightRef = (highlightElement: HTMLElement): void => {
    followerElement = highlightElement;
    didApplyCornerShape = false;
    baseFollowerRef(highlightElement);
  };

  const updateHighlight = (targetElement: HTMLElement | undefined): void => {
    baseFollowElement(targetElement);
    if (targetElement) {
      applyEdgeRadii(targetElement);
    }
  };

  return {
    containerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  };
};
