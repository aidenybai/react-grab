export { init } from "./core.js";
export {
  getStack,
  formatStack,
  getHTMLPreview,
  getNearestComponentName,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core.js";
export type {
  Options,
  ReactGrabAPI,
  Theme,
  ReactGrabState,
  RenderType,
  RenderData,
  OverlayBounds,
  GrabbedBox,
  DragRect,
  Rect,
  Position,
} from "./types.js";

import { init } from "./core.js";

if (typeof window !== "undefined") {
  init();
}
