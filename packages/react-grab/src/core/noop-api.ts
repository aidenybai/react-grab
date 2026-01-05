import type { ReactGrabAPI, ReactGrabState } from "../types.js";

export const createNoopApi = (): ReactGrabAPI => {
  const getState = (): ReactGrabState => {
    return {
      isActive: false,
      isDragging: false,
      isCopying: false,
      isPromptMode: false,
      isCrosshairVisible: false,
      isSelectionBoxVisible: false,
      isDragBoxVisible: false,
      targetElement: null,
      dragBounds: null,
      grabbedBoxes: [],
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
    setOptions: () => {},
    registerPlugin: () => {},
    unregisterPlugin: () => {},
    getPlugins: () => [],
  };
};
