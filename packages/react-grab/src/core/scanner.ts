import {
  instrument,
  didFiberRender,
  getDisplayName,
  getNearestHostFiber,
  isCompositeFiber,
  isInstrumentationActive,
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
import { formatRenderLabel } from "../utils/format-render-label.js";

interface ScanOutline {
  nameCounts: Map<string, number>;
  // Cached label, recomputed only on commit (not per frame) to keep the
  // render loop allocation-free.
  label: string;
  lastRenderTimestamp: number;
}

export interface ScannerController {
  start: () => void;
  stop: () => void;
  isScanning: () => boolean;
  takeTrace: () => ScanTrace | null;
}

let handleCommit: (root: FiberRoot) => void = () => {};

// Tracks whether bippy is instrumenting a React renderer. Scanning is
// meaningless without one, so the toolbar hides the scan button until this
// flips true (on instrumentation activating or the first React commit).
let hasActiveInstrumentation = isInstrumentationActive();
const instrumentationListeners = new Set<() => void>();

const markInstrumentationActive = (): void => {
  if (hasActiveInstrumentation) return;
  hasActiveInstrumentation = true;
  for (const listener of instrumentationListeners) listener();
};

export const isScanAvailable = (): boolean => hasActiveInstrumentation;

export const onScanAvailable = (listener: () => void): (() => void) => {
  instrumentationListeners.add(listener);
  return () => instrumentationListeners.delete(listener);
};

if (typeof window !== "undefined") {
  // Raw instrument() (not secure()): secure tears the commit hook down if a
  // React renderer isn't detected within its ~100ms install-check window, which
  // breaks scanning on apps that mount React after react-grab's script loads.
  // React core already wraps onCommitFiberRoot in try/catch, so this is safe.
  instrument({
    name: "react-grab",
    onActive: markInstrumentationActive,
    onCommitFiberRoot(_rendererId, root) {
      markInstrumentationActive();
      return handleCommit(root);
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

  const didNearestCompositeAncestorRender = (fiber: Fiber): boolean => {
    let ancestor = fiber.return;
    while (ancestor) {
      if (isCompositeFiber(ancestor)) return didFiberRender(ancestor);
      ancestor = ancestor.return;
    }
    return false;
  };

  const recordRenderedFiber = (fiber: Fiber): void => {
    if (!isCompositeFiber(fiber)) return;
    const componentName = getDisplayName(fiber.type);
    if (!componentName || !isUsefulComponentName(componentName)) return;

    recorder.collectFiber(fiber, componentName, didNearestCompositeAncestorRender(fiber));

    const hostFiber = getNearestHostFiber(fiber);
    const element = hostFiber?.stateNode;
    if (!(element instanceof HTMLElement)) return;

    const existingOutline = outlines.get(element);
    if (existingOutline) {
      const { nameCounts } = existingOutline;
      nameCounts.set(componentName, (nameCounts.get(componentName) ?? 0) + 1);
      existingOutline.label = formatRenderLabel(nameCounts);
      existingOutline.lastRenderTimestamp = currentCommitTimestamp;
    } else {
      const nameCounts = new Map<string, number>([[componentName, 1]]);
      outlines.set(element, {
        nameCounts,
        label: formatRenderLabel(nameCounts),
        lastRenderTimestamp: currentCommitTimestamp,
      });
    }
  };

  handleCommit = (root: FiberRoot): void => {
    if (!isScanning) return;
    currentCommitTimestamp = performance.now();
    recorder.beginCommit(currentCommitTimestamp);
    traverseRenderedFibers(root, recordRenderedFiber);
    recorder.endCommit();
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

    const labelText = outline.label;
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
    isScanning: () => isScanning,
    takeTrace: recorder.takeTrace,
  };
};
