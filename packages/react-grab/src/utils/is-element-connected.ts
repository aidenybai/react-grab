import { getElementAdapter } from "../core/element-adapter.js";

export const isElementConnected = (element: Element | null | undefined): element is Element => {
  if (!element) return false;
  const adapter = getElementAdapter(element);
  if (adapter) return adapter.isConnected();
  return Boolean(element.isConnected || element.ownerDocument?.contains(element));
};
