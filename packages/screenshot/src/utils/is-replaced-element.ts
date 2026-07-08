import { REPLACED_ELEMENT_TAGS } from "../constants";

export const isReplacedElement = (element: Element): boolean =>
  REPLACED_ELEMENT_TAGS.has(element.localName);
