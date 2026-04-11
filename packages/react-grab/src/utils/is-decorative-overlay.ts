const REPLACED_TAGS = new Set([
  "IMG",
  "VIDEO",
  "CANVAS",
  "SVG",
  "IFRAME",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OBJECT",
  "EMBED",
]);

export const isDecorativeOverlay = (element: Element, computedPosition: string): boolean =>
  (computedPosition === "absolute" || computedPosition === "fixed" || computedPosition === "sticky") &&
  !REPLACED_TAGS.has(element.tagName) &&
  element.childElementCount === 0 &&
  (element.textContent?.trim().length ?? 0) === 0;
