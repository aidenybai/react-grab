import { isElementNode } from "./is-element-node.js";

export const isHtmlElement = (element: unknown): element is HTMLElement =>
  isElementNode(element) && element.namespaceURI === "http://www.w3.org/1999/xhtml";
