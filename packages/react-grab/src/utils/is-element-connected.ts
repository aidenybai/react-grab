import { getElementAdapter } from "./element-adapter.js";

export const isElementConnected = (element: Element | null | undefined): element is Element =>
  Boolean(
    element &&
    (getElementAdapter(element)?.isConnected() ||
      element.isConnected ||
      element.ownerDocument?.contains(element)),
  );
