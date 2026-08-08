export const hasElementBoxPaint = (element: Element): boolean => {
  const style = element.ownerDocument.defaultView?.getComputedStyle?.(element);
  if (!style) return false;
  const hasBackground =
    style.backgroundClip !== "text" &&
    (style.backgroundImage !== "none" ||
      (style.backgroundColor !== "transparent" && style.backgroundColor !== "rgba(0, 0, 0, 0)"));
  const hasBorder =
    (style.borderTopStyle !== "none" && style.borderTopWidth !== "0px") ||
    (style.borderRightStyle !== "none" && style.borderRightWidth !== "0px") ||
    (style.borderBottomStyle !== "none" && style.borderBottomWidth !== "0px") ||
    (style.borderLeftStyle !== "none" && style.borderLeftWidth !== "0px");
  return hasBackground || hasBorder || style.boxShadow !== "none" || style.outlineStyle !== "none";
};
