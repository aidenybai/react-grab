export const isShadowRoot = (node: Node): node is ShadowRoot => {
  const ownerWindow = node.ownerDocument?.defaultView;
  return Boolean(ownerWindow && node instanceof ownerWindow.ShadowRoot);
};
