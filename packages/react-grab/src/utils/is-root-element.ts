import { getTagName } from "./get-tag-name.js";

export const isRootElement = (element: Element): boolean => {
  const tagName = getTagName(element);
  return tagName === "html" || tagName === "body";
};
