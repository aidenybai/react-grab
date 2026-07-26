import { isTextNode } from "./is-text-node.js";

export const isGrabbableTextNode = (node: Node): node is Text =>
  isTextNode(node) && Boolean(node.textContent?.trim());
