import { createSignal, type Accessor } from "solid-js";
import {
  ANNOTATION_CARET_GAP_PX,
  ANNOTATION_CARET_WIDTH_PX,
  ANNOTATION_COLOR,
  ANNOTATION_CURSOR,
  ANNOTATION_TEXT_FONT_PX,
  ANNOTATION_TEXT_HIT_PADDING_PX,
  IME_COMPOSING_KEY_CODE,
  SCREENSHOT_CAPTURE_DELAY_MS,
  Z_INDEX_ANNOTATION_CANVAS,
} from "../constants.js";
import type { AnnotationStroke, AnnotationText, CommittedAnnotation } from "../types.js";
import { captureElementScreenshot, copyImageToClipboard } from "../utils/capture-screenshot.js";
import { delay } from "../utils/delay.js";
import { getAnnotationStrokePath } from "../utils/get-annotation-stroke-path.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";

interface AnnotationModeDependencies {
  getRoot: () => HTMLElement;
  onOpen?: () => void;
  onClose?: () => void;
  onCopied?: () => void;
}

export interface AnnotationModeController {
  isActive: Accessor<boolean>;
  start: () => void;
  cancel: () => void;
  capture: () => Promise<void>;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export const createAnnotationModeController = (
  dependencies: AnnotationModeDependencies,
): AnnotationModeController => {
  const [isActive, setIsActive] = createSignal(false);

  let overlay: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;

  // Single ordered list so undo removes the genuinely-last action and later
  // items paint on top of earlier ones, regardless of stroke/text type.
  const committedItems: CommittedAnnotation[] = [];
  // Cache finished strokes' outlines so per-frame redraws don't recompute them.
  const committedStrokePaths = new WeakMap<AnnotationStroke, Path2D>();
  let activeStroke: AnnotationStroke | null = null;
  let activeText: AnnotationText | null = null;
  let activePointerId: number | null = null;
  let redrawFrameId: number | null = null;
  let isCapturing = false;
  let restoreChrome: (() => void) | null = null;
  // Bumped on every start() so an in-flight capture from a prior session can
  // detect it was superseded after an await and bail instead of copying a stale
  // shot and tearing down the new session.
  let sessionId = 0;
  const lastPointer = { x: 0, y: 0 };

  const TEXT_FONT = `500 ${ANNOTATION_TEXT_FONT_PX}px "Geist", system-ui, -apple-system, sans-serif`;

  const resizeCanvas = () => {
    if (!canvas) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context = canvas.getContext("2d");
    if (context) context.scale(devicePixelRatio, devicePixelRatio);
    redraw();
  };

  const drawText = (text: AnnotationText, isEditing: boolean) => {
    if (!context) return;
    context.fillStyle = ANNOTATION_COLOR;
    context.font = TEXT_FONT;
    context.textBaseline = "top";
    context.fillText(text.value, text.x, text.y);
    if (isEditing) {
      const caretX = text.x + context.measureText(text.value).width + ANNOTATION_CARET_GAP_PX;
      context.fillRect(caretX, text.y, ANNOTATION_CARET_WIDTH_PX, ANNOTATION_TEXT_FONT_PX);
    }
  };

  const fillStroke = (stroke: AnnotationStroke, isComplete: boolean) => {
    if (!context) return;
    let path = isComplete ? committedStrokePaths.get(stroke) : undefined;
    if (!path) {
      path = getAnnotationStrokePath(stroke, isComplete);
      if (isComplete) committedStrokePaths.set(stroke, path);
    }
    context.fillStyle = ANNOTATION_COLOR;
    context.fill(path);
  };

  const redraw = () => {
    redrawFrameId = null;
    if (!context) return;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // Items are stored in page coordinates; offsetting by the scroll position
    // pins them to the content so they ride along with scroll/resize.
    context.save();
    context.translate(-window.scrollX, -window.scrollY);
    for (const item of committedItems) {
      if (item.kind === "stroke") {
        fillStroke(item.stroke, true);
      } else {
        drawText(item.text, false);
      }
    }
    if (activeStroke && activeStroke.points.length > 0) {
      fillStroke(activeStroke, false);
    }
    if (activeText) {
      drawText(activeText, true);
    }
    context.restore();
  };

  const commitActiveText = () => {
    if (activeText && activeText.value.trim().length > 0) {
      committedItems.push({ kind: "text", text: activeText });
    }
    activeText = null;
  };

  const isPointInText = (text: AnnotationText, pageX: number, pageY: number): boolean => {
    if (!context) return false;
    context.font = TEXT_FONT;
    const width = context.measureText(text.value).width;
    return (
      pageX >= text.x - ANNOTATION_TEXT_HIT_PADDING_PX &&
      pageX <= text.x + width + ANNOTATION_TEXT_HIT_PADDING_PX &&
      pageY >= text.y - ANNOTATION_TEXT_HIT_PADDING_PX &&
      pageY <= text.y + ANNOTATION_TEXT_FONT_PX + ANNOTATION_TEXT_HIT_PADDING_PX
    );
  };

  const findCommittedTextAt = (pageX: number, pageY: number): number => {
    for (let index = committedItems.length - 1; index >= 0; index--) {
      const item = committedItems[index];
      if (item.kind === "text" && isPointInText(item.text, pageX, pageY)) return index;
    }
    return -1;
  };

  const scheduleRedraw = () => {
    if (redrawFrameId !== null) return;
    redrawFrameId = nativeRequestAnimationFrame(redraw);
  };

  const appendPoint = (event: PointerEvent) => {
    activeStroke?.points.push({
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
      pressure: event.pressure || 0.5,
    });
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !overlay) return;
    event.preventDefault();
    event.stopPropagation();
    // Ignore extra contacts while a stroke is already in progress so a second
    // touch doesn't discard the first.
    if (activePointerId !== null) return;
    const pageX = event.clientX + window.scrollX;
    const pageY = event.clientY + window.scrollY;
    lastPointer.x = pageX;
    lastPointer.y = pageY;

    // Clicking the note you're already typing keeps it open; clicking another
    // committed note reopens it for editing instead of starting a stroke.
    if (activeText && isPointInText(activeText, pageX, pageY)) return;
    const editIndex = findCommittedTextAt(pageX, pageY);
    commitActiveText();
    if (editIndex !== -1) {
      const [removed] = committedItems.splice(editIndex, 1);
      if (removed.kind === "text") activeText = removed.text;
      scheduleRedraw();
      return;
    }

    activePointerId = event.pointerId;
    overlay.setPointerCapture(event.pointerId);
    activeStroke = { points: [] };
    appendPoint(event);
    scheduleRedraw();
  };

  const handlePointerMove = (event: PointerEvent) => {
    const pageX = event.clientX + window.scrollX;
    const pageY = event.clientY + window.scrollY;
    lastPointer.x = pageX;
    lastPointer.y = pageY;
    if (!activeStroke && overlay) {
      overlay.style.cursor = findCommittedTextAt(pageX, pageY) !== -1 ? "text" : ANNOTATION_CURSOR;
    }
    if (!activeStroke || event.pointerId !== activePointerId) return;
    event.preventDefault();
    // Coalesced events recover the samples the browser batched between frames.
    const coalesced =
      typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    if (coalesced.length > 0) {
      for (const coalescedEvent of coalesced) appendPoint(coalescedEvent);
    } else {
      appendPoint(event);
    }
    scheduleRedraw();
  };

  const finishStroke = () => {
    if (activeStroke && activeStroke.points.length > 0) {
      committedItems.push({ kind: "stroke", stroke: activeStroke });
    }
    activeStroke = null;
    activePointerId = null;
    scheduleRedraw();
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    overlay?.releasePointerCapture(event.pointerId);
    finishStroke();
  };

  const undoLast = () => {
    if (activeText) {
      activeText = null;
    } else if (activeStroke) {
      activeStroke = null;
      activePointerId = null;
    } else {
      committedItems.pop();
    }
    scheduleRedraw();
  };

  const buildOverlay = () => {
    overlay = document.createElement("div");
    overlay.setAttribute("data-react-grab-ignore-events", "");
    overlay.setAttribute("data-react-grab-annotation", "");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: String(Z_INDEX_ANNOTATION_CANVAS),
      cursor: ANNOTATION_CURSOR,
      touchAction: "none",
      pointerEvents: "auto",
    } satisfies Partial<CSSStyleDeclaration>);

    canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    overlay.appendChild(canvas);

    overlay.addEventListener("pointerdown", handlePointerDown);
    overlay.addEventListener("pointermove", handlePointerMove);
    overlay.addEventListener("pointerup", handlePointerUp);
    overlay.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("resize", resizeCanvas);
    // Strokes live in page coordinates; redraw on scroll to keep them pinned to
    // the page. Capture phase because scroll events don't bubble.
    window.addEventListener("scroll", scheduleRedraw, { capture: true, passive: true });

    dependencies.getRoot().appendChild(overlay);
    resizeCanvas();
  };

  const teardown = () => {
    if (redrawFrameId !== null) {
      nativeCancelAnimationFrame(redrawFrameId);
      redrawFrameId = null;
    }
    restoreChromeForCapture();
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("scroll", scheduleRedraw, { capture: true });
    overlay?.remove();
    overlay = null;
    canvas = null;
    context = null;
    committedItems.length = 0;
    activeStroke = null;
    activeText = null;
    activePointerId = null;
    setIsActive(false);
    dependencies.onClose?.();
  };

  const start = () => {
    if (isActive()) return;
    setIsActive(true);
    sessionId += 1;
    lastPointer.x = window.scrollX + window.innerWidth / 2;
    lastPointer.y = window.scrollY + window.innerHeight / 2;
    buildOverlay();
    dependencies.onOpen?.();
  };

  const cancel = () => {
    if (!isActive()) return;
    teardown();
  };

  // The drawing canvas stays visible so the screen capture includes it
  // (WYSIWYG); react-grab's own chrome (toolbar + Copy/Cancel menu) is hidden so
  // it stays out of the shot.
  const hideChromeForCapture = () => {
    const root = dependencies.getRoot();
    const restorers = ["[data-react-grab-toolbar]", "[data-react-grab-annotation-menu]"].map(
      (selector) => {
        const element = root.querySelector<HTMLElement>(selector);
        if (!element) return () => {};
        const previousVisibility = element.style.visibility;
        element.style.visibility = "hidden";
        return () => {
          element.style.visibility = previousVisibility;
        };
      },
    );
    restoreChrome = () => {
      for (const restore of restorers) restore();
    };
  };

  // Idempotent so capture's cleanup and teardown (when the user exits mid-capture)
  // can both call it without double-restoring.
  const restoreChromeForCapture = () => {
    restoreChrome?.();
    restoreChrome = null;
  };

  const capture = async () => {
    if (!isActive() || isCapturing) return;
    finishStroke();
    commitActiveText();
    if (committedItems.length === 0) return;
    isCapturing = true;
    const session = sessionId;
    // True only if this exact session is still the live one - guards every
    // post-await step against the user exiting (or exiting and re-entering)
    // draw mode mid-capture.
    const isSessionLive = () => isActive() && sessionId === session;
    hideChromeForCapture();

    try {
      await delay(SCREENSHOT_CAPTURE_DELAY_MS);
      // Don't open the screen-share prompt if the user left draw mode during the
      // delay (Draw toggle, Escape, or dismissAllPopups).
      if (!isSessionLive()) return;
      const screenshot = await captureElementScreenshot({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      });
      restoreChromeForCapture();
      // The mode may have been torn down (or restarted) while the permission
      // prompt was open - don't copy an image the user abandoned.
      if (!isSessionLive()) return;
      const copied = await copyImageToClipboard(screenshot);
      if (!isSessionLive()) return;
      if (copied) {
        dependencies.onCopied?.();
        teardown();
      } else {
        logRecoverableError("Annotation copy to clipboard failed", null);
      }
    } catch (error) {
      // Dismissing the browser's screen-share prompt is a normal user action.
      if (error instanceof DOMException && error.name === "NotAllowedError") return;
      logRecoverableError("Annotation capture failed", error);
    } finally {
      restoreChromeForCapture();
      isCapturing = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive()) return;
    // Chromium reports keyCode 229 on the IME commit tick after isComposing
    // resets; ignore both so confirming a composition doesn't capture or corrupt
    // an in-progress text note.
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      // First Escape discards an in-progress text; a second exits the mode.
      if (activeText) {
        activeText = null;
        scheduleRedraw();
      } else {
        cancel();
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      commitActiveText();
      void capture();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      undoLast();
      return;
    }

    if (event.key === "Backspace") {
      if (!activeText) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      activeText.value = activeText.value.slice(0, -1);
      if (activeText.value.length === 0) activeText = null;
      scheduleRedraw();
      return;
    }

    // Typing a printable character drops/extends a text note at the cursor.
    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!activeText) {
        activeText = { x: lastPointer.x, y: lastPointer.y, value: "" };
      }
      activeText.value += event.key;
      scheduleRedraw();
    }
  };

  return { isActive, start, cancel, capture, handleKeyDown };
};
