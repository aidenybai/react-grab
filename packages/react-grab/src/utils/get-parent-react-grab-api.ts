import type { ReactGrabAPI } from "../types.js";

export const getParentReactGrabApi = (): ReactGrabAPI | null => {
  if (typeof window === "undefined" || window.parent === window) return null;

  try {
    return window.parent.__REACT_GRAB__ ?? null;
  } catch {
    return null;
  }
};
