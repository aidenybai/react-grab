import { XHTML_NAMESPACE_URI } from "../constants";

// Realm-safe replacement for instanceof HTML*Element checks (cross-document
// nodes are not instances of this window's element classes).
export const isHtmlElementOfTag = <TagName extends keyof HTMLElementTagNameMap>(
  element: Element,
  tagName: TagName,
): element is HTMLElementTagNameMap[TagName] =>
  element.localName === tagName && element.namespaceURI === XHTML_NAMESPACE_URI;
