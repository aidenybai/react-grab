import {
  instrument,
  didFiberRender,
  getDisplayName,
  getNearestHostFiber,
  getTimings,
  isCompositeFiber,
  isInstrumentationActive,
  traverseRenderedFibers,
  type Fiber,
  type FiberRoot,
} from "bippy";
import { createSignal, onCleanup, type Accessor } from "solid-js";
import {
  FEEDBACK_DURATION_MS,
  LONG_ANIMATION_FRAME_ENTRY_TYPE,
  MAX_SCAN_TRACE_COMMITS,
  MAX_SCAN_TRACE_FIBERS_PER_COMMIT,
  MAX_SCAN_TRACE_LOAF_ENTRIES,
  MAX_SCAN_TRACE_LOAF_SCRIPTS,
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
import type {
  ScanCommit,
  ScanLoafScript,
  ScanLongAnimationFrame,
  ScanRenderedFiber,
  ScanTrace,
} from "../types.js";
import { copyContent } from "../utils/copy-content.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { drawRoundedRectangle } from "../utils/draw-rounded-rectangle.js";
import { formatRenderLabel } from "../utils/format-render-label.js";
import { getChangeDescription } from "../utils/get-change-description.js";
import { getFiberSource } from "../utils/get-fiber-source.js";
import { hideFromThirdParties } from "../utils/hide-from-third-parties.js";
import { isUsefulComponentName } from "../utils/is-useful-component-name.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";
import { parseBorderRadiusValue } from "../utils/parse-border-radius-value.js";
import { serializeScanTrace } from "../utils/serialize-scan-trace.js";

// ---------------------------------------------------------------------------
// Trace recorder: per-commit fiber detail (actualDuration, why, where) + LoAFs.
// ---------------------------------------------------------------------------

// `long-animation-frame` fields aren't in the DOM lib types yet.
interface LongAnimationFrameScriptTiming {
  sourceURL?: string;
  sourceFunctionName?: string;
  sourceCharPosition?: number;
  duration?: number;
  forcedStyleAndLayoutDuration?: number;
}

interface LongAnimationFrameTiming extends PerformanceEntry {
  blockingDuration?: number;
  firstUIEventTimestamp?: number;
  scripts?: LongAnimationFrameScriptTiming[];
}

interface CollectedFiber {
  fiber: Fiber;
  name: string;
  actualDurationMs: number;
  parentRendered: boolean;
}

interface ScanTraceRecorder {
  begin: () => void;
  end: () => void;
  beginCommit: (timestamp: number) => void;
  collectFiber: (fiber: Fiber, name: string, parentRendered: boolean) => void;
  endCommit: () => void;
  takeTrace: () => ScanTrace | null;
}

const isLongAnimationFrameSupported = (): boolean =>
  typeof PerformanceObserver !== "undefined" &&
  Boolean(PerformanceObserver.supportedEntryTypes?.includes(LONG_ANIMATION_FRAME_ENTRY_TYPE));

const createScanTraceRecorder = (): ScanTraceRecorder => {
  const commits: ScanCommit[] = [];
  const longAnimationFrames: ScanLongAnimationFrame[] = [];
  const collected: CollectedFiber[] = [];
  let commitCount = 0;
  let currentCommitTimestamp = 0;
  let scanStartTimestamp = 0;
  let observer: PerformanceObserver | null = null;

  const ingestLoafEntries = (entries: PerformanceEntryList): void => {
    for (const entry of entries) {
      if (longAnimationFrames.length >= MAX_SCAN_TRACE_LOAF_ENTRIES) break;
      const loafEntry = entry as LongAnimationFrameTiming;
      const scripts: ScanLoafScript[] = (loafEntry.scripts ?? [])
        .slice(0, MAX_SCAN_TRACE_LOAF_SCRIPTS)
        .map((script) => ({
          sourceURL: script.sourceURL ?? "",
          sourceFunctionName: script.sourceFunctionName ?? "",
          sourceCharPosition: script.sourceCharPosition ?? 0,
          durationMs: script.duration ?? 0,
          forcedStyleAndLayoutDurationMs: script.forcedStyleAndLayoutDuration ?? 0,
        }));
      longAnimationFrames.push({
        startTimeMs: loafEntry.startTime,
        durationMs: loafEntry.duration,
        blockingDurationMs: loafEntry.blockingDuration ?? 0,
        firstUIEventTimestampMs: loafEntry.firstUIEventTimestamp ?? 0,
        scripts,
      });
    }
  };

  const begin = (): void => {
    commits.length = 0;
    longAnimationFrames.length = 0;
    collected.length = 0;
    commitCount = 0;
    scanStartTimestamp = performance.now();
    if (!isLongAnimationFrameSupported()) return;
    observer = new PerformanceObserver((list) => ingestLoafEntries(list.getEntries()));
    try {
      observer.observe({ type: LONG_ANIMATION_FRAME_ENTRY_TYPE, buffered: false });
    } catch {
      observer = null;
    }
  };

  const end = (): void => {
    if (!observer) return;
    // Drain buffered-but-undelivered entries (delivery is async) before disconnect.
    ingestLoafEntries(observer.takeRecords());
    observer.disconnect();
    observer = null;
  };

  const beginCommit = (timestamp: number): void => {
    currentCommitTimestamp = timestamp;
    commitCount += 1;
    collected.length = 0;
  };

  const collectFiber = (fiber: Fiber, name: string, parentRendered: boolean): void => {
    collected.push({ fiber, name, actualDurationMs: fiber.actualDuration ?? 0, parentRendered });
  };

  const endCommit = (): void => {
    if (collected.length === 0) return;
    collected.sort((first, second) => second.actualDurationMs - first.actualDurationMs);

    // actualDuration nests children, so the slowest fiber's is the commit total.
    const totalActualDurationMs = collected[0].actualDurationMs;

    // Enrich only the kept fibers, and now, while they're still this commit's
    // live alternates.
    const fibers: ScanRenderedFiber[] = collected
      .slice(0, MAX_SCAN_TRACE_FIBERS_PER_COMMIT)
      .map((entry) => ({
        name: entry.name,
        selfDurationMs: getTimings(entry.fiber).selfTime,
        source: getFiberSource(entry.fiber),
        change: getChangeDescription(entry.fiber, entry.parentRendered),
      }));

    commits.push({
      timestampMs: currentCommitTimestamp,
      totalActualDurationMs,
      renderedFiberCount: collected.length,
      fibers,
    });
    if (commits.length > MAX_SCAN_TRACE_COMMITS) commits.shift();
    collected.length = 0;
  };

  const takeTrace = (): ScanTrace | null => {
    if (commits.length === 0 && longAnimationFrames.length === 0) return null;
    return {
      durationMs: performance.now() - scanStartTimestamp,
      commitCount,
      commits: commits.slice(),
      longAnimationFrames: longAnimationFrames.slice(),
    };
  };

  return { begin, end, beginCommit, collectFiber, endCommit, takeTrace };
};

// ---------------------------------------------------------------------------
// Scanner: a single global commit hook driving a canvas of re-render outlines.
// ---------------------------------------------------------------------------

interface ScanOutline {
  nameCounts: Map<string, number>;
  label: string;
  lastRenderTimestamp: number;
}

interface ScannerController {
  start: () => void;
  stop: () => void;
  isScanning: () => boolean;
  takeTrace: () => ScanTrace | null;
}

let handleCommit: (root: FiberRoot) => void = () => {};

let hasActiveInstrumentation = isInstrumentationActive();
const instrumentationListeners = new Set<() => void>();

const markInstrumentationActive = (): void => {
  if (hasActiveInstrumentation) return;
  hasActiveInstrumentation = true;
  for (const listener of instrumentationListeners) listener();
};

const isScanAvailable = (): boolean => hasActiveInstrumentation;

const onScanAvailable = (listener: () => void): (() => void) => {
  instrumentationListeners.add(listener);
  return () => instrumentationListeners.delete(listener);
};

if (typeof window !== "undefined") {
  // Not secure(): it tears the hook down if React isn't detected within ~100ms,
  // which breaks apps that mount React after react-grab's script loads.
  instrument({
    name: "react-grab",
    onActive: markInstrumentationActive,
    onCommitFiberRoot(_rendererId, root) {
      markInstrumentationActive();
      return handleCommit(root);
    },
  });
}

const createScanner = (): ScannerController => {
  let isScanning = false;
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let devicePixelRatio = 1;
  let animationFrameId: number | null = null;

  const outlines = new Map<HTMLElement, ScanOutline>();
  const recorder = createScanTraceRecorder();

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

// ---------------------------------------------------------------------------
// Controller: reactive scan state, clipboard copy on stop, "copied" toast.
// ---------------------------------------------------------------------------

export interface ScanController {
  isScanAvailable: Accessor<boolean>;
  isScanning: Accessor<boolean>;
  // Fresh token per copy so the toolbar can key (and replay) its toast.
  scanCopiedToken: Accessor<number | null>;
  toggle: () => void;
  stop: () => void;
}

export const createScanController = (): ScanController => {
  const scanner = createScanner();
  const [scanAvailable, setScanAvailable] = createSignal(isScanAvailable());
  onCleanup(onScanAvailable(() => setScanAvailable(true)));
  const [isScanning, setIsScanning] = createSignal(false);
  const [scanCopiedToken, setScanCopiedToken] = createSignal<number | null>(null);
  let scanCopiedCount = 0;
  let scanCopiedTimeout: ReturnType<typeof setTimeout> | undefined;

  const flashCopied = () => {
    scanCopiedCount += 1;
    setScanCopiedToken(scanCopiedCount);
    clearTimeout(scanCopiedTimeout);
    scanCopiedTimeout = setTimeout(() => setScanCopiedToken(null), FEEDBACK_DURATION_MS);
  };

  const stop = () => {
    if (!scanner.isScanning()) return;
    scanner.stop();
    setIsScanning(false);
  };

  const toggle = () => {
    if (scanner.isScanning()) {
      stop();
      const trace = scanner.takeTrace();
      if (trace && copyContent(serializeScanTrace(trace), { componentName: "ReactGrabScan" })) {
        flashCopied();
      }
      return;
    }
    scanner.start();
    setIsScanning(true);
  };

  onCleanup(() => {
    clearTimeout(scanCopiedTimeout);
    stop();
  });

  return { isScanAvailable: scanAvailable, isScanning, scanCopiedToken, toggle, stop };
};
