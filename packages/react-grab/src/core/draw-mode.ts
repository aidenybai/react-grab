import { createSignal, type Accessor } from "solid-js";
import {
  DRAW_CARET_WIDTH_PX,
  DRAW_COLOR,
  DRAW_CURSOR,
  DRAW_TEXT_FONT_PX,
  DRAW_TEXT_HIT_PADDING_PX,
  IME_COMPOSING_KEY_CODE,
  Z_INDEX_DRAW_CANVAS,
} from "../constants.js";
import type { DrawStroke, DrawText, CommittedDraw } from "../types.js";
import { captureElementScreenshot, copyImageToClipboard } from "../utils/capture-screenshot.js";
import { getDrawStrokePath } from "../utils/get-draw-stroke-path.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";

interface DrawModeDependencies {
  getRoot: () => HTMLElement;
  onOpen?: () => void;
  onClose?: () => void;
  onCopied?: () => void;
}

export interface DrawModeController {
  isActive: Accessor<boolean>;
  start: () => void;
  cancel: () => void;
  capture: () => Promise<void>;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export const createDrawModeController = (
  dependencies: DrawModeDependencies,
): DrawModeController => {
  const [isActive, setIsActive] = createSignal(false);

  let overlay: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;

  // Single ordered list so undo removes the genuinely-last action and later
  // items paint on top of earlier ones, regardless of stroke/text type.
  const committedItems: CommittedDraw[] = [];
  const committedStrokePaths = new WeakMap<DrawStroke, Path2D>();
  const committedTextWidths = new WeakMap<DrawText, number>();
  let activeStroke: DrawStroke | null = null;
  let activePointerId: number | null = null;
  let redrawFrameId: number | null = null;
  let restoreChrome: (() => void) | null = null;
  // Bumped on every start() so an in-flight capture from a prior session can
  // detect it was superseded after an await and bail instead of copying a stale
  // shot and tearing down the new session.
  let sessionId = 0;
  // The session id whose capture is in flight (null when idle). Scoped to the
  // session so a stale capture can't block a new one's Copy/Enter, and its
  // cleanup can't clear a newer one's flag.
  let capturingSession: number | null = null;
  // The note being typed is a real <input> (native caret/selection/IME); it is
  // flattened onto the canvas on commit so the screenshot stays WYSIWYG.
  let textInput: HTMLInputElement | null = null;
  const textInputPosition = { x: 0, y: 0 };
  // Last pointer position in client (viewport) coords, converted to page coords
  // when placing a note - so scrolling without moving the mouse still drops the
  // note under the cursor.
  const lastPointer = { x: 0, y: 0 };
  let isCursorOverText = false;

  const TEXT_FONT = `500 ${DRAW_TEXT_FONT_PX}px "Geist", system-ui, -apple-system, sans-serif`;

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

  const drawText = (text: DrawText) => {
    if (!context) return;
    context.fillStyle = DRAW_COLOR;
    context.font = TEXT_FONT;
    context.textBaseline = "top";
    context.fillText(text.value, text.x, text.y);
  };

  const fillStroke = (stroke: DrawStroke, isComplete: boolean) => {
    if (!context) return;
    let path = isComplete ? committedStrokePaths.get(stroke) : undefined;
    if (!path) {
      path = getDrawStrokePath(stroke, isComplete);
      if (isComplete) committedStrokePaths.set(stroke, path);
    }
    context.fillStyle = DRAW_COLOR;
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
        drawText(item.text);
      }
    }
    if (activeStroke && activeStroke.points.length > 0) {
      fillStroke(activeStroke, false);
    }
    context.restore();
  };

  const measureTextWidth = (value: string): number => {
    if (!context) return 0;
    context.font = TEXT_FONT;
    return context.measureText(value).width;
  };

  const measureCommittedTextWidth = (text: DrawText): number => {
    let width = committedTextWidths.get(text);
    if (width === undefined) {
      width = measureTextWidth(text.value);
      committedTextWidths.set(text, width);
    }
    return width;
  };

  const findCommittedTextAt = (pageX: number, pageY: number): number => {
    for (let index = committedItems.length - 1; index >= 0; index--) {
      const item = committedItems[index];
      if (item.kind !== "text") continue;
      const { text } = item;
      const width = measureCommittedTextWidth(text);
      if (
        pageX >= text.x - DRAW_TEXT_HIT_PADDING_PX &&
        pageX <= text.x + width + DRAW_TEXT_HIT_PADDING_PX &&
        pageY >= text.y - DRAW_TEXT_HIT_PADDING_PX &&
        pageY <= text.y + DRAW_TEXT_FONT_PX + DRAW_TEXT_HIT_PADDING_PX
      ) {
        return index;
      }
    }
    return -1;
  };

  const scheduleRedraw = () => {
    if (redrawFrameId !== null) return;
    redrawFrameId = nativeRequestAnimationFrame(redraw);
  };

  // Align the input's text with where the canvas draws the note once committed.
  const positionTextInput = () => {
    if (!textInput) return;
    textInput.style.left = `${textInputPosition.x - window.scrollX}px`;
    textInput.style.top = `${textInputPosition.y - window.scrollY}px`;
  };

  const resizeTextInput = () => {
    if (!textInput) return;
    // Leave room for the trailing caret so it isn't clipped at the text's end.
    textInput.style.width = `${Math.ceil(measureTextWidth(textInput.value)) + DRAW_CARET_WIDTH_PX}px`;
  };

  const openTextInput = (pageX: number, pageY: number, initialValue: string) => {
    if (!overlay) return;
    commitTextInput();
    textInputPosition.x = pageX;
    textInputPosition.y = pageY;

    const input = document.createElement("input");
    input.type = "text";
    input.value = initialValue;
    input.setAttribute("data-react-grab-ignore-events", "");
    Object.assign(input.style, {
      position: "absolute",
      margin: "0",
      padding: "0",
      border: "none",
      background: "transparent",
      font: TEXT_FONT,
      lineHeight: `${DRAW_TEXT_FONT_PX}px`,
      height: `${DRAW_TEXT_FONT_PX}px`,
      color: DRAW_COLOR,
      caretColor: DRAW_COLOR,
      outline: "none",
      boxSizing: "content-box",
      pointerEvents: "auto",
    } satisfies Partial<CSSStyleDeclaration>);
    input.addEventListener("input", resizeTextInput);
    input.addEventListener("blur", commitTextInput);

    overlay.appendChild(input);
    textInput = input;
    resizeTextInput();
    positionTextInput();
    input.focus();
    input.setSelectionRange(initialValue.length, initialValue.length);
  };

  const removeTextInput = (): HTMLInputElement | null => {
    if (!textInput) return null;
    const input = textInput;
    textInput = null;
    input.removeEventListener("input", resizeTextInput);
    input.removeEventListener("blur", commitTextInput);
    input.remove();
    return input;
  };

  const commitTextInput = () => {
    const input = removeTextInput();
    if (!input) return;
    const value = input.value;
    if (value.trim().length > 0) {
      committedItems.push({
        kind: "text",
        text: { x: textInputPosition.x, y: textInputPosition.y, value },
      });
    }
    scheduleRedraw();
  };

  const discardTextInput = () => {
    if (removeTextInput()) scheduleRedraw();
  };

  const appendPoint = (event: PointerEvent) => {
    activeStroke?.points.push({
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
      pressure: event.pressure,
    });
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !overlay) return;
    // Clicks inside the note's <input> position its caret natively.
    if (event.target === textInput) return;
    event.preventDefault();
    event.stopPropagation();
    // Ignore extra contacts while a stroke is already in progress.
    if (activePointerId !== null) return;
    const pageX = event.clientX + window.scrollX;
    const pageY = event.clientY + window.scrollY;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;

    // Clicking away commits the open note before drawing or editing another.
    commitTextInput();

    const editIndex = findCommittedTextAt(pageX, pageY);
    if (editIndex !== -1) {
      const [removed] = committedItems.splice(editIndex, 1);
      if (removed.kind === "text") {
        committedTextWidths.delete(removed.text);
        openTextInput(removed.text.x, removed.text.y, removed.text.value);
      }
      scheduleRedraw();
      return;
    }

    activePointerId = event.pointerId;
    overlay.setPointerCapture(event.pointerId);
    activeStroke = { points: [], simulatePressure: event.pointerType !== "pen" };
    appendPoint(event);
    scheduleRedraw();
  };

  const handlePointerMove = (event: PointerEvent) => {
    const pageX = event.clientX + window.scrollX;
    const pageY = event.clientY + window.scrollY;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    if (!activeStroke && overlay) {
      const overText = findCommittedTextAt(pageX, pageY) !== -1;
      if (overText !== isCursorOverText) {
        isCursorOverText = overText;
        overlay.style.cursor = overText ? "text" : DRAW_CURSOR;
      }
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

  const releaseActivePointerCapture = () => {
    if (activePointerId !== null && overlay?.hasPointerCapture(activePointerId)) {
      overlay.releasePointerCapture(activePointerId);
    }
  };

  const finishStroke = () => {
    if (activeStroke && activeStroke.points.length > 0) {
      committedItems.push({ kind: "stroke", stroke: activeStroke });
    }
    releaseActivePointerCapture();
    activeStroke = null;
    activePointerId = null;
    scheduleRedraw();
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    finishStroke();
  };

  const undoLast = () => {
    if (activeStroke) {
      // Release here too: undoing mid-stroke leaves handlePointerUp unable to
      // (its pointer id no longer matches).
      releaseActivePointerCapture();
      activeStroke = null;
      activePointerId = null;
    } else {
      committedItems.pop();
    }
    scheduleRedraw();
  };

  const suppressContextMenu = (event: Event) => event.preventDefault();

  const handleViewportScroll = () => {
    positionTextInput();
    scheduleRedraw();
  };

  const buildOverlay = () => {
    isCursorOverText = false;
    overlay = document.createElement("div");
    overlay.setAttribute("data-react-grab-ignore-events", "");
    overlay.setAttribute("data-react-grab-draw", "");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: String(Z_INDEX_DRAW_CANVAS),
      cursor: DRAW_CURSOR,
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
    overlay.addEventListener("contextmenu", suppressContextMenu);
    window.addEventListener("resize", resizeCanvas);
    // Capture phase because scroll events don't bubble.
    window.addEventListener("scroll", handleViewportScroll, { capture: true, passive: true });

    dependencies.getRoot().appendChild(overlay);
    resizeCanvas();
  };

  const teardown = () => {
    removeTextInput();
    if (redrawFrameId !== null) {
      nativeCancelAnimationFrame(redrawFrameId);
      redrawFrameId = null;
    }
    restoreChromeForCapture();
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("scroll", handleViewportScroll, { capture: true });
    overlay?.remove();
    overlay = null;
    canvas = null;
    context = null;
    committedItems.length = 0;
    activeStroke = null;
    activePointerId = null;
    setIsActive(false);
    dependencies.onClose?.();
  };

  const start = () => {
    if (isActive()) return;
    setIsActive(true);
    sessionId += 1;
    lastPointer.x = window.innerWidth / 2;
    lastPointer.y = window.innerHeight / 2;
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
    const restorers = ["[data-react-grab-toolbar]", "[data-react-grab-draw-menu]"].map(
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

  // Idempotent so capture's cleanup and teardown (mid-capture exit) can both call it.
  const restoreChromeForCapture = () => {
    restoreChrome?.();
    restoreChrome = null;
  };

  const capture = async () => {
    if (!isActive()) return;
    const session = sessionId;
    // Re-entrancy guard scoped to this session (e.g. Enter pressed twice).
    if (capturingSession === session) return;
    finishStroke();
    commitTextInput();
    // Nothing drawn: exit instead of silently no-opping, so Enter/Copy give
    // visible feedback (the overlay closes) rather than appearing frozen.
    if (committedItems.length === 0) {
      cancel();
      return;
    }
    capturingSession = session;
    const isSessionLive = () => isActive() && sessionId === session;

    try {
      const screenshot = await captureElementScreenshot(
        { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        // Hide chrome only for the frame grab, not the whole share prompt.
        () => {
          if (!isSessionLive()) return;
          hideChromeForCapture();
        },
      );
      restoreChromeForCapture();
      // Torn down (or restarted) while the permission prompt was open - don't
      // copy an image the user abandoned.
      if (!isSessionLive()) return;
      const copied = await copyImageToClipboard(screenshot);
      if (!isSessionLive()) return;
      if (copied) {
        dependencies.onCopied?.();
        teardown();
      } else {
        logRecoverableError("Draw copy to clipboard failed", null);
      }
    } catch (error) {
      // Dismissing the browser's screen-share prompt is a normal user action.
      if (error instanceof DOMException && error.name === "NotAllowedError") return;
      logRecoverableError("Draw capture failed", error);
    } finally {
      restoreChromeForCapture();
      if (capturingSession === session) capturingSession = null;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive()) return;

    // While a note is open its <input> owns typing, caret, selection, IME and
    // its own undo; intercept only commit (Enter) and discard (Escape), and not
    // while an IME composition is using them.
    if (textInput) {
      if (event.isComposing) return;
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        void capture();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        discardTextInput();
      }
      return;
    }

    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      cancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      void capture();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      undoLast();
      return;
    }

    // A printable key (not mid-stroke) opens a note at the cursor and seeds it
    // with that character; the <input> takes over from there.
    if (
      !activeStroke &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      event.key.length === 1
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTextInput(lastPointer.x + window.scrollX, lastPointer.y + window.scrollY, event.key);
    }
  };

  return { isActive, start, cancel, capture, handleKeyDown };
};
