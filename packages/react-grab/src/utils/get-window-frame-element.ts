export const getWindowFrameElement = (targetWindow: Window | null): Element | null => {
  if (!targetWindow) return null;
  try {
    return targetWindow.frameElement;
  } catch {
    return null;
  }
};
