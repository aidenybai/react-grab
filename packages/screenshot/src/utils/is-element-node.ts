// instanceof Element fails for nodes from another realm (e.g. same-origin
// iframe documents during nested capture), so node kinds are checked by type.
export const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;
