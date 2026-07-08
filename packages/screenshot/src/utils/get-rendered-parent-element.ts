export const getRenderedParentElement = (element: Element): Element | null => {
  if (element.parentElement) return element.parentElement;
  const parentNode = element.parentNode;
  return parentNode instanceof ShadowRoot ? parentNode.host : null;
};
