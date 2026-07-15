import { isShadowRoot } from "./is-shadow-root.js";

export const getShadowActiveElement = (node: Node): Element | null => {
  const rootNode = node.getRootNode();
  if (isShadowRoot(rootNode)) {
    return rootNode.activeElement;
  }
  return node.ownerDocument?.activeElement ?? document.activeElement;
};
