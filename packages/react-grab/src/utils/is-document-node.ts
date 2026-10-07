import { DOCUMENT_NODE_TYPE } from "../constants.js";

export const isDocumentNode = (node: unknown): node is Document =>
  typeof node === "object" &&
  node !== null &&
  "nodeType" in node &&
  node.nodeType === DOCUMENT_NODE_TYPE;
