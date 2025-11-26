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
  DeepPartial,
  SuccessLabelType,
  ElementLabelVariant,
  InputModeContext,
  SuccessLabelContext,
  CrosshairContext,
  ElementLabelContext,
} from "./types.js";

import { init } from "./core.js";
import type { ReactGrabAPI } from "./types.js";

let globalApi: ReactGrabAPI | null = null;

export const getGlobalApi = (): ReactGrabAPI | null => {
  return globalApi;
};

if (typeof window !== "undefined") {
  globalApi = init();
}
