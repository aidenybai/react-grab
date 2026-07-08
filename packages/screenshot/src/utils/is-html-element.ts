import { XHTML_NAMESPACE_URI } from "../constants";

export const isHtmlElement = (element: Element): element is HTMLElement =>
  element.namespaceURI === XHTML_NAMESPACE_URI;
