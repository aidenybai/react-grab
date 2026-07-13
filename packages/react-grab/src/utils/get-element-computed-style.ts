export const getElementComputedStyle = (element: Element): CSSStyleDeclaration => {
  const ownerWindow = element.ownerDocument.defaultView;
  return ownerWindow ? ownerWindow.getComputedStyle(element) : window.getComputedStyle(element);
};
