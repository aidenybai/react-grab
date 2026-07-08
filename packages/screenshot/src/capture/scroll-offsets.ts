const INHERITED_LAYOUT_WRAPPER_STYLE =
  "all:unset;display:inherit;flex-direction:inherit;flex-wrap:inherit;" +
  "row-gap:inherit;column-gap:inherit;align-items:inherit;align-content:inherit;" +
  "justify-content:inherit;justify-items:inherit;" +
  "grid-template-columns:inherit;grid-template-rows:inherit;grid-template-areas:inherit;" +
  "grid-auto-flow:inherit;grid-auto-columns:inherit;grid-auto-rows:inherit;";

export const applyScrollOffsets = (
  clone: Element,
  scrollLeft: number,
  scrollTop: number,
  ownerDocument: Document,
): void => {
  const scrollWrapper = ownerDocument.createElement("div");
  scrollWrapper.setAttribute(
    "style",
    `${INHERITED_LAYOUT_WRAPPER_STYLE}transform:translate(${-scrollLeft}px,${-scrollTop}px);will-change:transform;`,
  );
  while (clone.firstChild) scrollWrapper.appendChild(clone.firstChild);
  clone.appendChild(scrollWrapper);
};
