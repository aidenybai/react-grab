import {
  instrument,
  getDisplayName,
  getNearestHostFiber,
  isCompositeFiber,
  traverseRenderedFibers,
  type Fiber,
  type FiberRoot,
} from "bippy";
import {
  MIN_DEVICE_PIXEL_RATIO,
  OVERLAY_BORDER_COLOR_DEFAULT,
  OVERLAY_FILL_COLOR_DEFAULT,
  SCAN_LABEL_FONT,
  SCAN_LABEL_HEIGHT_PX,
  SCAN_LABEL_PADDING_PX,
  SCAN_LABEL_TEXT_COLOR,
  SCAN_OUTLINE_DURATION_MS,
  Z_INDEX_SCAN_CANVAS,
} from "../constants.js";
import type { ScanTrace } from "../types.js";
import { createScanTraceRecorder } from "./scan-trace-recorder.js";
import { hideFromThirdParties } from "../utils/hide-from-third-parties.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";
import { isUsefulComponentName } from "../utils/is-useful-component-name.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { drawRoundedRectangle } from "../utils/draw-rounded-rectangle.js";
import { parseBorderRadiusValue } from "../utils/parse-border-radius-value.js";

interface ScanOutline {
  componentName: string;
  renderCount: number;
  lastRenderTimestamp: number;
}

export interface ScannerController {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  isScanning: () => boolean;
  takeTrace: () => ScanTrace | null;
  dispose: () => void;
}

let handleCommit: (rendererId: number, root: FiberRoot) => void = () => {};

if (typeof window !== "undefined") {
  instrument({
    name: "react-grab-scan",
    onCommitFiberRoot(_rendererId, root) {
      return handleCommit(_rendererId, root);
    },
  });
}

export const createScanner = (): ScannerController => {
  let isScanning = false;
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let devicePixelRatio = 1;
  let animationFrameId: number | null = null;

  const outlines = new Map<HTMLElement, ScanOutline>();
  const recorder = createScanTraceRecorder();

  // Set once per commit so the per-fiber recorder reads a single clock value
  // instead of calling performance.now() inside the hot fiber walk.
  let currentCommitTimestamp = 0;

  const recordRenderedFiber = (fiber: Fiber): void => {
    if (!isCompositeFiber(fiber)) return;
    const componentName = getDisplayName(fiber.type);
    if (!componentName || !isUsefulComponentName(componentName)) return;

    recorder.recordFiber(componentName, fiber);

    const hostFiber = getNearestHostFiber(fiber);
    const element = hostFiber?.stateNode;
    if (!(element instanceof HTMLElement)) return;

    const existingOutline = outlines.get(element);
    if (existingOutline) {
      existingOutline.componentName = componentName;
      existingOutline.renderCount += 1;
      existingOutline.lastRenderTimestamp = currentCommitTimestamp;
    } else {
      outlines.set(element, {
        componentName,
        renderCount: 1,
        lastRenderTimestamp: currentCommitTimestamp,
      });
    }
  };

  handleCommit = (_rendererId: number, root: FiberRoot): void => {
    if (!isScanning) return;
    currentCommitTimestamp = performance.now();
    recorder.beginCommit(currentCommitTimestamp);
    traverseRenderedFibers(root, recordRenderedFiber);
    scheduleFrame();
  };

  const resizeCanvas = (): void => {
    if (!canvas) return;
    devicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    canvas.width = viewportWidth * devicePixelRatio;
    canvas.height = viewportHeight * devicePixelRatio;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    context = canvas.getContext("2d");
    if (context) context.scale(devicePixelRatio, devicePixelRatio);
  };

  const ensureCanvas = (): void => {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.setAttribute("data-react-grab-scan-canvas", "");
    hideFromThirdParties(canvas);
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = String(Z_INDEX_SCAN_CANVAS);
    document.body.appendChild(canvas);
    resizeCanvas();
  };

  const drawOutline = (element: HTMLElement, outline: ScanOutline, opacity: number): void => {
    if (!context) return;
    const elementBounds = createElementBounds(element);
    if (elementBounds.width <= 0 || elementBounds.height <= 0) return;

    drawRoundedRectangle(
      context,
      elementBounds.x,
      elementBounds.y,
      elementBounds.width,
      elementBounds.height,
      parseBorderRadiusValue(elementBounds.borderRadius),
      OVERLAY_FILL_COLOR_DEFAULT,
      OVERLAY_BORDER_COLOR_DEFAULT,
      opacity,
    );

    const labelText =
      outline.renderCount > 1
        ? `${outline.componentName} ×${outline.renderCount}`
        : outline.componentName;
    context.globalAlpha = opacity;
    context.font = SCAN_LABEL_FONT;
    const labelWidth = context.measureText(labelText).width + SCAN_LABEL_PADDING_PX * 2;
    const labelTop =
      elementBounds.y - SCAN_LABEL_HEIGHT_PX >= 0
        ? elementBounds.y - SCAN_LABEL_HEIGHT_PX
        : elementBounds.y;
    context.fillStyle = OVERLAY_BORDER_COLOR_DEFAULT;
    context.fillRect(elementBounds.x, labelTop, labelWidth, SCAN_LABEL_HEIGHT_PX);
    context.fillStyle = SCAN_LABEL_TEXT_COLOR;
    context.textBaseline = "middle";
    context.fillText(
      labelText,
      elementBounds.x + SCAN_LABEL_PADDING_PX,
      labelTop + SCAN_LABEL_HEIGHT_PX / 2,
    );
    context.globalAlpha = 1;
  };

  const renderFrame = (): void => {
    animationFrameId = null;
    if (!context) return;

    context.clearRect(0, 0, viewportWidth, viewportHeight);

    const currentTimestamp = performance.now();
    let hasActiveOutlines = false;

    for (const [element, outline] of outlines) {
      const elapsedSinceRenderMs = currentTimestamp - outline.lastRenderTimestamp;
      if (elapsedSinceRenderMs >= SCAN_OUTLINE_DURATION_MS || !element.isConnected) {
        outlines.delete(element);
        continue;
      }
      drawOutline(element, outline, 1 - elapsedSinceRenderMs / SCAN_OUTLINE_DURATION_MS);
      hasActiveOutlines = true;
    }

    if (isScanning && hasActiveOutlines) scheduleFrame();
  };

  const scheduleFrame = (): void => {
    if (animationFrameId !== null) return;
    animationFrameId = nativeRequestAnimationFrame(renderFrame);
  };

  const start = (): void => {
    if (isScanning) return;
    isScanning = true;
    recorder.begin();
    ensureCanvas();
    window.addEventListener("resize", resizeCanvas);
    scheduleFrame();
  };

  // The recorder's trace is intentionally preserved after stop() so the caller
  // can read it via takeTrace(); the next start() clears it via recorder.begin().
  const stop = (): void => {
    if (!isScanning) return;
    isScanning = false;
    recorder.end();
    window.removeEventListener("resize", resizeCanvas);
    if (animationFrameId !== null) {
      nativeCancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    outlines.clear();
    canvas?.remove();
    canvas = null;
    context = null;
  };

  return {
    start,
    stop,
    toggle: () => (isScanning ? stop() : start()),
    isScanning: () => isScanning,
    takeTrace: recorder.takeTrace,
    dispose: stop,
  };
};
