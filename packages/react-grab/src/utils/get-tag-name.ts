import { getElementAdapter } from "../core/element-adapter.js";

export const getTagName = (element: Element): string =>
  getElementAdapter(element)?.getTagName() ?? (element.tagName || "").toLowerCase();
