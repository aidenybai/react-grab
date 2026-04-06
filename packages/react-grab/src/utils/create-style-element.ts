import { markReplayPrivate } from "./mark-replay-private.js";

export const createStyleElement = (attribute: string, content: string): HTMLStyleElement => {
  const element = document.createElement("style");
  element.setAttribute(attribute, "");
  markReplayPrivate(element);
  element.textContent = content;
  document.head.appendChild(element);
  return element;
};
