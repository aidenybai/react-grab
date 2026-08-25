export const stabilizeLayout = (element: Element): void => {
  const style = getComputedStyle(element);
  const outlineStyle = style.outlineStyle;
  const outlineWidth = style.outlineWidth;
  const borderStyle = style.borderStyle;
  const borderWidth = style.borderWidth;

  const outlineVisible = outlineStyle !== "none" && parseFloat(outlineWidth) > 0;
  const borderAbsent = borderStyle === "none" || parseFloat(borderWidth) === 0;

  if (outlineVisible && borderAbsent && element instanceof HTMLElement) {
    element.style.border = `${outlineWidth} solid transparent`;
  }
};

export const forceContentVisibility = (root: Element): (() => void) => {
  const saved: { el: HTMLElement; original: string }[] = [];
  try {
    const all = root.querySelectorAll("*");
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      const cv = el.style.contentVisibility || "";
      const cs = getComputedStyle(el);
      const computed = cs.contentVisibility || cs.getPropertyValue("content-visibility") || "";
      if (computed === "auto" || computed === "hidden") {
        saved.push({ el, original: cv });
        el.style.contentVisibility = "visible";
      }
    }
    if (root instanceof HTMLElement) {
      const cs = getComputedStyle(root);
      const computed = cs.contentVisibility || cs.getPropertyValue("content-visibility") || "";
      if (computed === "auto" || computed === "hidden") {
        saved.push({ el: root, original: root.style.contentVisibility || "" });
        root.style.contentVisibility = "visible";
      }
    }
  } catch {}
  return () => {
    for (const { el, original } of saved) {
      try {
        el.style.contentVisibility = original;
      } catch {}
    }
  };
};
