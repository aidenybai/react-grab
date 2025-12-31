import type {
  ReactGrabAPI,
  ReactGrabState,
  Theme,
  RequiredActivationKey,
} from "../types.js";
import { getDefaultShortcut } from "../shortcut/state.js";

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

  let currentShortcut: RequiredActivationKey = getDefaultShortcut();

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
    updateShortcut: (shortcut: RequiredActivationKey) => {
      currentShortcut = shortcut;
    },
    getShortcut: () => currentShortcut,
  };
};
