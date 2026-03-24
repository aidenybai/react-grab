type ViewportEdge = "top" | "bottom" | "left" | "right";

export const getNearestEdge = (rect: DOMRect): ViewportEdge => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distanceToTop = centerY;
  const distanceToBottom = window.innerHeight - centerY;
  const distanceToLeft = centerX;
  const distanceToRight = window.innerWidth - centerX;
  const minimumDistance = Math.min(
    distanceToTop,
    distanceToBottom,
    distanceToLeft,
    distanceToRight,
  );
  if (minimumDistance === distanceToTop) return "top";
  if (minimumDistance === distanceToLeft) return "left";
  if (minimumDistance === distanceToRight) return "right";
  return "bottom";
};
