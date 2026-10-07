export const isElementNode = (node: unknown): node is Element =>
  typeof node === "object" &&
  node !== null &&
  "nodeType" in node &&
  node.nodeType === Node.ELEMENT_NODE;
