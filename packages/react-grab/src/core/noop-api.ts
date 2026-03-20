import type { ReactGrabAPI } from "../types.js";

const NOOP_STATE = Object.freeze({
  isActive: false,
  isDragging: false,
  isCopying: false,
  isPromptMode: false,
  isSelectionBoxVisible: false,
  isDragBoxVisible: false,
  targetElement: null,
  dragBounds: null,
  grabbedBoxes: [],
  labelInstances: [],
  selectionFilePath: null,
  toolbarState: null,
});

const NOOP = () => {};
const NOOP_UNSUB = () => NOOP;

export const createNoopApi = (): ReactGrabAPI => {
  return new Proxy({} as ReactGrabAPI, {
    get(_target, property) {
      if (property === "getState") return () => ({ ...NOOP_STATE });
      if (property === "onToolbarStateChange") return NOOP_UNSUB;
      if (property === "getPlugins") return () => [];
      if (property === "copyElement") return () => Promise.resolve(false);
      if (property === "getSource") return () => Promise.resolve(null);
      if (property === "getStackContext") return () => Promise.resolve("");
      if (property === "isActive" || property === "isEnabled")
        return () => false;
      if (property === "getToolbarState" || property === "getDisplayName")
        return () => null;
      return NOOP;
    },
  });
};
