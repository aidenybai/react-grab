import { TEXT_NODE_LABEL_MAX_LENGTH } from "../constants.js";
import { truncateString } from "./truncate-string.js";

export const formatTextNodeLabel = (textNode: Text): string => {
  const textContent = textNode.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return `"${truncateString(textContent, TEXT_NODE_LABEL_MAX_LENGTH)}"`;
};
