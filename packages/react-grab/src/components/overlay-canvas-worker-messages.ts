import type {
  OverlayCanvasDragState,
  OverlayCanvasGrabbedState,
  OverlayCanvasInitialState,
  OverlayCanvasRendererStyles,
  OverlayCanvasSelectionState,
} from "./overlay-canvas-renderer.js";

export interface OverlayCanvasWorkerMessage {
  kind: "initialize" | "resize" | "selection" | "drag" | "grabbed";
  canvas?: OffscreenCanvas;
  width?: number;
  height?: number;
  devicePixelRatio?: number;
  colorSpace?: PredefinedColorSpace;
  initialState?: OverlayCanvasInitialState;
  styles?: OverlayCanvasRendererStyles;
  selection?: OverlayCanvasSelectionState;
  drag?: OverlayCanvasDragState;
  grabbed?: OverlayCanvasGrabbedState;
}
