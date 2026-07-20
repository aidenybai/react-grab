import { BASELINE_FRAME_DURATION_MS } from "../constants.js";
import {
  createOverlayCanvasRenderer,
  type OverlayCanvasRenderer,
  type OverlayCanvasRendererScheduler,
} from "../components/overlay-canvas-renderer.js";
import type { OverlayCanvasWorkerMessage } from "../components/overlay-canvas-worker-messages.js";

let renderer: OverlayCanvasRenderer | null = null;
const supportsAnimationFrame = typeof requestAnimationFrame === "function";

const scheduler: OverlayCanvasRendererScheduler = {
  requestFrame: (callback) =>
    supportsAnimationFrame
      ? requestAnimationFrame(callback)
      : self.setTimeout(() => callback(performance.now()), BASELINE_FRAME_DURATION_MS),
  cancelFrame: (animationFrameId) => {
    if (supportsAnimationFrame) {
      cancelAnimationFrame(animationFrameId);
    } else {
      self.clearTimeout(animationFrameId);
    }
  },
  setTimeout: (callback, delayMs) => self.setTimeout(callback, delayMs),
  clearTimeout: (timeoutId) => self.clearTimeout(timeoutId),
};

self.addEventListener("message", (event: MessageEvent<OverlayCanvasWorkerMessage>) => {
  const message = event.data;
  if (
    message.kind === "initialize" &&
    message.canvas &&
    message.width !== undefined &&
    message.height !== undefined &&
    message.devicePixelRatio !== undefined &&
    message.colorSpace &&
    message.initialState &&
    message.styles
  ) {
    renderer?.destroy();
    renderer = createOverlayCanvasRenderer({
      canvas: message.canvas,
      width: message.width,
      height: message.height,
      devicePixelRatio: message.devicePixelRatio,
      colorSpace: message.colorSpace,
      styles: message.styles,
      scheduler,
      initialState: message.initialState,
    });
    return;
  }
  if (!renderer) return;
  if (
    message.kind === "resize" &&
    message.width !== undefined &&
    message.height !== undefined &&
    message.devicePixelRatio !== undefined
  ) {
    renderer.resize(message.width, message.height, message.devicePixelRatio);
  } else if (message.kind === "selection" && message.selection) {
    renderer.updateSelection(message.selection);
  } else if (message.kind === "drag" && message.drag) {
    renderer.updateDrag(message.drag);
  } else if (message.kind === "grabbed" && message.grabbed) {
    renderer.updateGrabbed(message.grabbed);
  }
});
