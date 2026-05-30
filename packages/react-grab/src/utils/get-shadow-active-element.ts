export const getShadowActiveElement = (node: Node): Element | null => {
  const rootNode = node.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return rootNode.activeElement;
  }
  return node.ownerDocument?.activeElement ?? document.activeElement;
};
