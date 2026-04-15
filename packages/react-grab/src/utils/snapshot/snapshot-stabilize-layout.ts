export const stabilizeElementLayout = (element: Element): (() => void) => {
  const computed = getComputedStyle(element);
  const outlineStyle = computed.outlineStyle;
  const outlineWidth = computed.outlineWidth;
  const borderStyle = computed.borderStyle;
  const borderWidth = computed.borderWidth;

  const hasVisibleOutline = outlineStyle !== "none" && parseFloat(outlineWidth) > 0;
  const hasBorder = borderStyle !== "none" && parseFloat(borderWidth) > 0;

  if (hasVisibleOutline && !hasBorder && element instanceof HTMLElement) {
    const previousBorder = element.style.border;
    element.style.border = `${outlineWidth} solid transparent`;
    return () => {
      element.style.border = previousBorder;
    };
  }

  return () => {};
};
