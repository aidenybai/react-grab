import type { ReactGrabAPI, ReactGrabState, Theme } from "../types.js";

export const createNoopApi = (theme: Required<Theme>): ReactGrabAPI => {
  const getState = (): ReactGrabState => {
    return {
      isActive: false,
      isDragging: false,
      isCopying: false,
      isInputMode: false,
      targetElement: null,
      dragBounds: null,
    };
  };

  return {
    activate: () => {},
    deactivate: () => {},
    toggle: () => {},
    isActive: () => false,
    dispose: () => {},
    copyElement: () => Promise.resolve(false),
    getState,
    updateTheme: () => {},
    getTheme: () => theme,
    setAgent: () => {},
    updateOptions: () => {},
  };
};
