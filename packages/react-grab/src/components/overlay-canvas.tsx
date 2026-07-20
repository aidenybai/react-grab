import { createEffect, on, onCleanup, onMount, type Component } from "solid-js";
import {
  DRAG_LERP_FACTOR,
  MIN_DEVICE_PIXEL_RATIO,
  OVERLAY_BORDER_COLOR_DEFAULT,
  OVERLAY_BORDER_COLOR_DRAG,
  OVERLAY_FILL_COLOR_DEFAULT,
  OVERLAY_FILL_COLOR_DRAG,
  SELECTION_LERP_FACTOR,
  Z_INDEX_OVERLAY_CANVAS,
} from "../constants.js";
import type { OverlayBounds, SelectionLabelInstance } from "../types.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";
import { supportsDisplayP3 } from "../utils/supports-display-p3.js";
import { supportsOffscreenCanvasWorker } from "../utils/supports-offscreen-canvas-worker.js";
import OverlayCanvasWorker from "../workers/overlay-canvas-worker.ts?worker&inline";
import {
  createOverlayCanvasRenderer,
  type OverlayCanvasDragState,
  type OverlayCanvasGrabbedState,
  type OverlayCanvasInitialState,
  type OverlayCanvasRenderer,
  type OverlayCanvasRendererStyles,
  type OverlayCanvasSelectionState,
} from "./overlay-canvas-renderer.js";
import type { OverlayCanvasWorkerMessage } from "./overlay-canvas-worker-messages.js";

interface OverlayCanvasProps {
  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  selectionBoundsMultiple?: OverlayBounds[];
  selectionShouldSnap?: boolean;
  dragVisible?: boolean;
  dragBounds?: OverlayBounds;
  grabbedBoxes?: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;
  labelInstances?: SelectionLabelInstance[];
}

interface OverlayCanvasBackend {
  resize: (width: number, height: number, devicePixelRatio: number) => void;
  updateSelection: (state: OverlayCanvasSelectionState) => void;
  updateDrag: (state: OverlayCanvasDragState) => void;
  updateGrabbed: (state: OverlayCanvasGrabbedState) => void;
  destroy: () => void;
}

const OVERLAY_CANVAS_STYLES: OverlayCanvasRendererStyles = {
  drag: {
    borderColor: OVERLAY_BORDER_COLOR_DRAG,
    fillColor: OVERLAY_FILL_COLOR_DRAG,
    lerpFactor: DRAG_LERP_FACTOR,
  },
  selection: {
    borderColor: OVERLAY_BORDER_COLOR_DEFAULT,
    fillColor: OVERLAY_FILL_COLOR_DEFAULT,
    lerpFactor: SELECTION_LERP_FACTOR,
  },
};

const createMainThreadBackend = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  devicePixelRatio: number,
  colorSpace: PredefinedColorSpace,
  initialState: OverlayCanvasInitialState,
): OverlayCanvasRenderer =>
  createOverlayCanvasRenderer({
    canvas,
    width,
    height,
    devicePixelRatio,
    colorSpace,
    styles: OVERLAY_CANVAS_STYLES,
    initialState,
    scheduler: {
      requestFrame: nativeRequestAnimationFrame,
      cancelFrame: nativeCancelAnimationFrame,
      setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimeout: (timeoutId) => window.clearTimeout(timeoutId),
    },
  });

const createWorkerBackend = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  devicePixelRatio: number,
  colorSpace: PredefinedColorSpace,
  initialState: OverlayCanvasInitialState,
): OverlayCanvasBackend | null => {
  if (!supportsOffscreenCanvasWorker(canvas)) return null;

  let worker: Worker;
  try {
    worker = new OverlayCanvasWorker({ name: "react-grab-overlay-canvas" });
  } catch {
    return null;
  }

  let offscreenCanvas: OffscreenCanvas;
  try {
    offscreenCanvas = canvas.transferControlToOffscreen();
  } catch {
    worker.terminate();
    return null;
  }

  const postMessage = (message: OverlayCanvasWorkerMessage) => worker.postMessage(message);
  worker.postMessage(
    {
      kind: "initialize",
      canvas: offscreenCanvas,
      width,
      height,
      devicePixelRatio,
      colorSpace,
      styles: OVERLAY_CANVAS_STYLES,
      initialState,
    } satisfies OverlayCanvasWorkerMessage,
    [offscreenCanvas],
  );

  return {
    resize: (nextWidth, nextHeight, nextDevicePixelRatio) =>
      postMessage({
        kind: "resize",
        width: nextWidth,
        height: nextHeight,
        devicePixelRatio: nextDevicePixelRatio,
      }),
    updateSelection: (selection) => postMessage({ kind: "selection", selection }),
    updateDrag: (drag) => postMessage({ kind: "drag", drag }),
    updateGrabbed: (grabbed) => postMessage({ kind: "grabbed", grabbed }),
    destroy: () => worker.terminate(),
  };
};

export const OverlayCanvas: Component<OverlayCanvasProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let backend: OverlayCanvasBackend | null = null;
  let devicePixelRatio = 1;
  let selectionState: OverlayCanvasSelectionState = { isVisible: false };
  let dragState: OverlayCanvasDragState = { isVisible: false };
  let grabbedState: OverlayCanvasGrabbedState = { boxes: [], labels: [] };

  const getCanvasDimensions = () => ({
    // Size to the layout viewport (documentElement.clientWidth/Height), not
    // window.innerWidth/Height. Under browser zoom the latter shrink to the
    // visual viewport while getBoundingClientRect — which positions the boxes —
    // keeps returning full layout coordinates, so a canvas sized to innerWidth
    // draws the selection box off-canvas for anything past the shrunken edge
    // (the "selection box gone entirely when zoomed" bug).
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  });

  const resizeCanvas = () => {
    if (!canvasRef || !backend) return;
    devicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
    const dimensions = getCanvasDimensions();
    canvasRef.style.width = `${dimensions.width}px`;
    canvasRef.style.height = `${dimensions.height}px`;
    backend.resize(dimensions.width, dimensions.height, devicePixelRatio);
  };

  createEffect(
    on(
      () =>
        [
          props.selectionVisible,
          props.selectionBounds,
          props.selectionBoundsMultiple,
          props.selectionShouldSnap,
        ] as const,
      ([isVisible, bounds, boundsMultiple, shouldSnap]) => {
        selectionState = {
          isVisible: Boolean(isVisible),
          bounds,
          boundsMultiple,
          shouldSnap,
        };
        backend?.updateSelection(selectionState);
      },
    ),
  );

  createEffect(
    on(
      () => [props.dragVisible, props.dragBounds] as const,
      ([isVisible, bounds]) => {
        dragState = { isVisible: Boolean(isVisible), bounds };
        backend?.updateDrag(dragState);
      },
    ),
  );

  createEffect(
    on(
      () => [props.grabbedBoxes, props.labelInstances] as const,
      ([boxes, labels]) => {
        grabbedState = {
          boxes: boxes ?? [],
          labels: (labels ?? []).map((label) => ({
            id: label.id,
            bounds: label.bounds,
            boundsMultiple: label.boundsMultiple,
            isFading: label.status === "fading",
          })),
        };
        backend?.updateGrabbed(grabbedState);
      },
    ),
  );

  onMount(() => {
    if (!canvasRef) return;
    devicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
    const dimensions = getCanvasDimensions();
    const colorSpace: PredefinedColorSpace = supportsDisplayP3() ? "display-p3" : "srgb";
    const initialState: OverlayCanvasInitialState = {
      selection: selectionState,
      drag: dragState,
      grabbed: grabbedState,
    };

    canvasRef.style.width = `${dimensions.width}px`;
    canvasRef.style.height = `${dimensions.height}px`;
    const workerBackend = createWorkerBackend(
      canvasRef,
      dimensions.width,
      dimensions.height,
      devicePixelRatio,
      colorSpace,
      initialState,
    );
    backend =
      workerBackend ??
      createMainThreadBackend(
        canvasRef,
        dimensions.width,
        dimensions.height,
        devicePixelRatio,
        colorSpace,
        initialState,
      );
    canvasRef.setAttribute(
      "data-react-grab-overlay-backend",
      workerBackend ? "worker" : "main-thread",
    );

    window.addEventListener("resize", resizeCanvas);
    let currentDprMediaQuery: MediaQueryList | null = null;

    const handleDevicePixelRatioChange = () => {
      const nextDevicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
      if (nextDevicePixelRatio !== devicePixelRatio) {
        resizeCanvas();
        setupDprMediaQuery();
      }
    };

    const setupDprMediaQuery = () => {
      currentDprMediaQuery?.removeEventListener("change", handleDevicePixelRatioChange);
      currentDprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      currentDprMediaQuery.addEventListener("change", handleDevicePixelRatioChange);
    };

    setupDprMediaQuery();
    onCleanup(() => {
      window.removeEventListener("resize", resizeCanvas);
      currentDprMediaQuery?.removeEventListener("change", handleDevicePixelRatioChange);
      backend?.destroy();
      backend = null;
    });
  });

  return (
    <canvas
      ref={canvasRef}
      data-react-grab-overlay-canvas
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        "pointer-events": "none",
        "z-index": String(Z_INDEX_OVERLAY_CANVAS),
      }}
    />
  );
};
