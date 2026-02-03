export const isElementConnected = (
  element: Element | null | undefined,
): element is Element =>
  Boolean(element?.isConnected ?? element?.ownerDocument?.contains(element));
