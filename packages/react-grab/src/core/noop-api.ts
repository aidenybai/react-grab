import type { ReactGrabAPI } from "../types.js";

const NOOP = () => {};

export const createNoopApi = (): ReactGrabAPI => ({
  activate: NOOP,
  deactivate: NOOP,
  toggle: NOOP,
  comment: NOOP,
  isActive: () => false,
  isEnabled: () => false,
  setEnabled: NOOP,
  getToolbarState: () => null,
  setToolbarState: NOOP,
  onToolbarStateChange: () => NOOP,
  dispose: NOOP,
  copyElement: () => Promise.resolve(false),
  getSource: () => Promise.resolve(null),
  getStackContext: () => Promise.resolve(""),
  getState: () => ({
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
  }),
  setOptions: NOOP,
  registerPlugin: NOOP,
  unregisterPlugin: NOOP,
  getPlugins: () => [],
  getDisplayName: () => null,
});
