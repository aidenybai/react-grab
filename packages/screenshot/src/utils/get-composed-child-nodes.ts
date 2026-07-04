import { isElementNode } from "./is-element-node";
import { isHtmlElementOfTag } from "./is-html-element-of-tag";

export const getComposedChildNodes = (
  element: Element,
  isInShadowTree = true,
): ArrayLike<Node> & Iterable<Node> => {
  const shadowRoot = element.shadowRoot;
  // Slots only pull assigned nodes inside a shadow tree; outside one, a slot
  // renders its own children, which plain iteration already covers.
  if (shadowRoot === null && !isInShadowTree) return element.childNodes;
  const rootChildNodes = shadowRoot ? shadowRoot.childNodes : element.childNodes;
  let hasSlotChild = false;
  for (let index = 0; index < rootChildNodes.length; index += 1) {
    const childNode = rootChildNodes[index];
    if (isElementNode(childNode) && childNode.localName === "slot") {
      hasSlotChild = true;
      break;
    }
  }
  if (!hasSlotChild) return rootChildNodes;
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
