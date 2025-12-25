export const getTagName = (element: Element): string =>
  (element.tagName || "").toLowerCase();
