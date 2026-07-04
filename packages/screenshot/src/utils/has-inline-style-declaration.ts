export const hasInlineStyleDeclaration = (
  element: Element,
): element is Element & { style: CSSStyleDeclaration } =>
  "style" in element && element.style instanceof CSSStyleDeclaration;
