import { isElementNode } from "./is-element-node";
import { isHtmlElementOfTag } from "./is-html-element-of-tag";

export const getComposedChildNodes = (element: Element): Node[] => {
  const rootChildNodes = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes;
  const composedChildNodes: Node[] = [];
  for (const childNode of rootChildNodes) {
    if (isElementNode(childNode) && isHtmlElementOfTag(childNode, "slot")) {
      const assignedNodes = childNode.assignedNodes({ flatten: true });
      if (assignedNodes.length > 0) composedChildNodes.push(...assignedNodes);
      else composedChildNodes.push(...childNode.childNodes);
    } else {
      composedChildNodes.push(childNode);
    }
  }
  return composedChildNodes;
};
