export const preserveScrollPosition = (
  sourceElement: Element,
  serializedHtml: string,
  styles: Record<string, string>,
): string => {
  const scrollLeft = sourceElement.scrollLeft;
  const scrollTop = sourceElement.scrollTop;

  if (!scrollLeft && !scrollTop) return serializedHtml;

  styles.overflow = "hidden";
  styles["scrollbar-width"] = "none";

  return `<div style="transform: translate(${-scrollLeft}px, ${-scrollTop}px); will-change: transform; display: inline-block; width: 100%;">${serializedHtml}</div>`;
};

export const adjustPositionedChildForScroll = (
  parentElement: Element,
  childStyles: Record<string, string>,
): void => {
  const scrollLeft = parentElement.scrollLeft || 0;
  const scrollTop = parentElement.scrollTop || 0;

  if (!scrollLeft && !scrollTop) return;

  const childPosition = childStyles.position;
  if (childPosition !== "fixed" && childPosition !== "absolute") return;

  const currentTop = parseFloat(childStyles.top || "0") || 0;
  const currentLeft = parseFloat(childStyles.left || "0") || 0;
  childStyles.top = `${currentTop + scrollTop}px`;
  childStyles.left = `${currentLeft + scrollLeft}px`;

  if (childPosition === "fixed") {
    childStyles.position = "absolute";
  }
};
