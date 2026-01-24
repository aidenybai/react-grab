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
      selectionFilePath: null,
    };
  };

  return {
    activate: () => {},
    deactivate: () => {},
    toggle: () => {},
    isActive: () => false,
    isEnabled: () => false,
    setEnabled: () => {},
    getToolbarState: () => null,
    setToolbarState: () => {},
    onToolbarStateChange: () => () => {},
    dispose: () => {},
    copyElement: () => Promise.resolve(false),
    getSource: () => Promise.resolve(null),
    getState,
    setOptions: () => {},
    registerPlugin: () => {},
    unregisterPlugin: () => {},
    getPlugins: () => [],
    getDisplayName: () => null,
  };
};
