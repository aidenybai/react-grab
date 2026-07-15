import { isHtmlElement } from "./is-html-element.js";

export const isIframeElement = (element: unknown): element is HTMLIFrameElement =>
  isHtmlElement(element) && element.tagName === "IFRAME";
