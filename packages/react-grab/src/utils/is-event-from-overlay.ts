import { isHtmlElement } from "./is-html-element.js";

export const isEventFromOverlay = (event: Event, attribute: string): boolean => {
  try {
    return event
      .composedPath()
      .some((target) => isHtmlElement(target) && target.hasAttribute(attribute));
  } catch {
    return false;
  }
};
