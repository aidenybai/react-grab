// Display-only demo entrypoint. Built with `process.env.IS_DEMO === "true"`, so
// the React Grab core it bundles runs in demo mode: real user input is ignored,
// the clipboard is never written, and the overlay is click-through. The showcase
// is driven entirely through the synthetic-event primitives returned here.
//
// This is a low-level driver: it mounts React Grab scoped to a container, paints
// an animated cursor, and exposes the building blocks (move, click, type, key)
// for a consumer to choreograph. It deliberately does not script a sequence -
// the consumer owns the storyboard.
import { init } from "./core/index.js";
import type { Position, ReactGrabAPI } from "./types.js";
import { lerp } from "./utils/lerp.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./utils/native-raf.js";
import { getScopeContainer } from "./utils/runtime-mode.js";
import {
  DEMO_CLICK_PULSE_MIN_SCALE,
  DEMO_CLICK_PULSE_MS,
  DEMO_CURSOR_FADE_MS,
  DEMO_CURSOR_TIP_X_PX,
  DEMO_CURSOR_TIP_Y_PX,
  DEMO_TYPE_CHAR_MS,
  REACT_GRAB_ATTRIBUTE_NAME,
  REACT_GRAB_INPUT_ATTRIBUTE,
  Z_INDEX_OVERLAY,
} from "./constants.js";

const CURSOR_SHADOW_FILTER_ID = "react-grab-demo-cursor-shadow";

// macOS-style pointer (19×26) whose tip sits near the top-left; the cursor
// element is offset by DEMO_CURSOR_TIP_{X,Y}_PX so the tip lands on the target.
const CURSOR_SVG = `<svg width="19" height="26" viewBox="0 0 19 26" fill="none" xmlns="http://www.w3.org/2000/svg"><g filter="url(#${CURSOR_SHADOW_FILTER_ID})"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.501 4.2601L13.884 12.6611C14.937 13.7171 14.19 15.5191 12.699 15.5191L11.475 15.519L12.6908 18.4067C12.9038 18.9127 12.9068 19.4727 12.6998 19.9817C12.4918 20.4917 12.0978 20.8897 11.5898 21.1027C11.3338 21.2097 11.0658 21.2637 10.7918 21.2637C9.9608 21.2637 9.2158 20.7687 8.8938 20.0027L7.616 16.965L6.784 17.7031C5.703 18.6591 4 17.8921 4 16.4481V4.8811C4 4.0971 4.947 3.7051 5.501 4.2601Z" fill="white"/></g><path fill-rule="evenodd" clip-rule="evenodd" d="M4.99951 5.5292C4.99951 5.3982 5.15851 5.3322 5.25051 5.4252L13.1585 13.3502C13.5895 13.7822 13.2835 14.5192 12.6735 14.5192L9.96951 14.5177L11.7691 18.7936C11.9961 19.3336 11.7421 19.9546 11.2031 20.1806C10.6621 20.4076 10.0421 20.1546 9.81611 19.6156L7.99851 15.2917L6.13851 16.9392C5.72251 17.3072 5.08063 17.0507 5.00655 16.5274L4.99951 16.4262V5.5292Z" fill="black"/><defs><filter id="${CURSOR_SHADOW_FILTER_ID}" x="0" y="0" width="18.3766" height="25.2637" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="2"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/></filter></defs></svg>`;

type GrabDemoInput = HTMLInputElement | HTMLTextAreaElement;
type GrabDemoPoint = Position;

interface GrabDemoOptions {
  /** The element the showcase is confined to. The cursor is painted inside it. */
  container: HTMLElement;
}

interface GrabDemoController {
  /** The underlying React Grab API (activate, comment, reset, dispose, …). */
  api: ReactGrabAPI;
  showCursor: () => void;
  /** Snap the cursor to a container-relative point without animating. */
  setCursorPosition: (x: number, y: number) => void;
  /** Glide the cursor to a container-relative point, driving hover en route.
   * Pass buttons=1 to keep the primary button held (a drag). */
  moveCursor: (x: number, y: number, durationMs: number, buttons?: number) => Promise<void>;
  /** Play the click "squish" on the cursor. */
  pulseCursor: (durationMs?: number) => Promise<void>;
  /** Pulse, then synthesize a pointer down/up at a container-relative point. */
  click: (x: number, y: number) => Promise<void>;
  /** Press at the current point, glide to a point with the button held (a
   * drag-select), then release. */
  drag: (toX: number, toY: number, durationMs: number) => Promise<void>;
  /** Synthesize keydown+keyup. Defaults to the element under the cursor. */
  pressKey: (key: string, target?: EventTarget) => void;
  /** Type into a React Grab input, one character at a time. */
  typeText: (text: string, target: GrabDemoInput, perCharMs?: number) => Promise<void>;
  /** Set an input's value via the native setter so React's tracker sees it. */
  setInputValue: (input: GrabDemoInput, value: string) => void;
  /** Re-anchor the hover to the cursor's current point after a scroll. */
  syncPointer: () => void;
  /** Container-relative center of an element. */
  centerOf: (element: Element) => GrabDemoPoint;
  /** The currently open React Grab comment/edit input, if any. */
  getInput: () => GrabDemoInput | null;
  wait: (durationMs: number) => Promise<void>;
  /** Abort any in-flight move/pulse/wait and resolve its promise. */
  cancel: () => void;
  dispose: () => void;
}

const easeInOutCubic = (progress: number): number =>
  progress < 0.5 ? 4 * progress * progress * progress : 1 - (-2 * progress + 2) ** 3 / 2;

export const createGrabDemo = (options: GrabDemoOptions): GrabDemoController => {
  const { container } = options;

  const position: GrabDemoPoint = { x: 0, y: 0 };
  let cursorScale = 1;
  let heldButtons = 0;
  let animationFrameId: number | null = null;
  let timeoutId: number | null = null;
  let resolvePending: (() => void) | null = null;
  // Bumped by cancel()/dispose() so multi-step helpers (click, drag, typeText)
  // abort between steps — settlePending() RESOLVES the in-flight await, so
  // without a token check their continuations would keep dispatching synthetic
  // events into a torn-down or re-started showcase. Single-shot waits/animations
  // are torn down via settlePending().
  let cancelToken = 0;

  // React Grab is single-instance (one shadow host, one scope singleton), so a
  // second concurrent demo would silently corrupt the first. Fail loudly
  // instead of clobbering it; dispose the existing demo before creating another.
  if (getScopeContainer()) {
    throw new Error(
      "[react-grab] createGrabDemo supports one active instance at a time; dispose the previous one first.",
    );
  }

  // The cursor is absolutely positioned, so the container must be a positioning
  // context. Promote it only if the page left it static, and remember so dispose
  // can restore it.
  const didPromoteContainerPosition = getComputedStyle(container).position === "static";
  if (didPromoteContainerPosition) {
    container.style.position = "relative";
  }

  // init() applies (and, on dispose, clears) the scope after its single-init
  // guard, so a no-op init can never leave the scope pointing at this container.
  const api = init({ container });

  const cursorElement = document.createElement("div");
  cursorElement.setAttribute("aria-hidden", "true");
  cursorElement.style.position = "absolute";
  cursorElement.style.top = "0";
  cursorElement.style.left = "0";
  cursorElement.style.pointerEvents = "none";
  cursorElement.style.zIndex = String(Z_INDEX_OVERLAY);
  cursorElement.style.opacity = "0";
  cursorElement.style.transition = `opacity ${DEMO_CURSOR_FADE_MS}ms ease`;
  cursorElement.style.willChange = "transform";
  cursorElement.innerHTML = CURSOR_SVG;
  container.appendChild(cursorElement);

  const applyCursorTransform = (): void => {
    cursorElement.style.transform = `translate3d(${position.x - DEMO_CURSOR_TIP_X_PX}px, ${position.y - DEMO_CURSOR_TIP_Y_PX}px, 0) scale(${cursorScale})`;
  };

  // Synthetic pointer events carry isTrusted=false, so React Grab's demo gate
  // lets them through while ignoring real input. Coordinates are container-
  // relative and converted to client space here.
  const createPointerEvent = (
    type: "pointermove" | "pointerdown" | "pointerup",
    clientX: number,
    clientY: number,
    buttons: number,
  ): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      button: 0,
      buttons,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });

  const dispatchPointer = (
    type: "pointermove" | "pointerdown" | "pointerup",
    x: number,
    y: number,
    buttons: number,
  ): void => {
    const rect = container.getBoundingClientRect();
    const clientX = rect.left + x;
    const clientY = rect.top + y;
    const target = document.elementFromPoint(clientX, clientY) ?? document.body;
    target.dispatchEvent(createPointerEvent(type, clientX, clientY, buttons));
  };

  // Per-frame moves during a glide: React Grab's window listeners only read the
  // coordinates, so dispatching on the container with a rect cached at glide
  // start skips the per-frame getBoundingClientRect + elementFromPoint (two
  // forced layout/hit-test passes at ~60fps in the looping showcase). A scroll
  // mid-glide shifts the rect, but the host page's scroll → syncPointer path
  // already re-anchors with a fresh rect.
  const dispatchMoveWithRect = (rect: DOMRect, x: number, y: number, buttons: number): void => {
    container.dispatchEvent(
      createPointerEvent("pointermove", rect.left + x, rect.top + y, buttons),
    );
  };

  const pointerMove = (x: number, y: number): void => dispatchPointer("pointermove", x, y, 0);
  const pointerDown = (x: number, y: number): void => {
    heldButtons = 1;
    dispatchPointer("pointerdown", x, y, 1);
  };
  const pointerUp = (x: number, y: number): void => {
    heldButtons = 0;
    dispatchPointer("pointerup", x, y, 0);
  };

  // Re-emit a pointer move at the cursor's current container-relative point. The
  // cursor is anchored to the container, so it stays glued to its element across
  // scroll — but React Grab tracks the pointer in viewport space, so a scroll
  // leaves its hover stale (it re-hit-tests the old client point, latching onto
  // whatever slid under it). Re-dispatching with the current container rect
  // re-maps to the right client point and re-anchors the hover. heldButtons keeps
  // a marquee drag intact if a scroll lands mid-drag.
  const syncPointer = (): void =>
    dispatchPointer("pointermove", position.x, position.y, heldButtons);

  const elementAtCursor = (): Element => {
    const rect = container.getBoundingClientRect();
    return (
      document.elementFromPoint(rect.left + position.x, rect.top + position.y) ?? document.body
    );
  };

  // Resolve and clear the single in-flight wait/animation so starting a new step
  // (or cancelling) can never orphan the previous step's promise.
  const settlePending = (): void => {
    if (animationFrameId !== null) nativeCancelAnimationFrame(animationFrameId);
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    animationFrameId = null;
    timeoutId = null;
    const resolve = resolvePending;
    resolvePending = null;
    resolve?.();
  };

  const cancel = (): void => {
    cancelToken += 1;
    settlePending();
    heldButtons = 0;
    cursorScale = 1;
    applyCursorTransform();
  };

  const wait = (durationMs: number): Promise<void> => {
    settlePending();
    return new Promise((resolve) => {
      resolvePending = resolve;
      timeoutId = window.setTimeout(settlePending, durationMs);
    });
  };

  // Single rAF driver shared by moveCursor/pulseCursor: ticks onProgress with a
  // 0->1 ratio over durationMs, then settles. Keeps the loop, timing, and
  // promise cleanup in one place.
  const animate = (durationMs: number, onProgress: (progress: number) => void): Promise<void> => {
    settlePending();
    return new Promise((resolve) => {
      resolvePending = resolve;
      const startTime = performance.now();
      const frame = (now: number): void => {
        const progress = durationMs <= 0 ? 1 : Math.min(1, (now - startTime) / durationMs);
        onProgress(progress);
        if (progress < 1) {
          animationFrameId = nativeRequestAnimationFrame(frame);
        } else {
          settlePending();
        }
      };
      animationFrameId = nativeRequestAnimationFrame(frame);
    });
  };

  const moveCursor = (
    targetX: number,
    targetY: number,
    durationMs: number,
    buttons = 0,
  ): Promise<void> => {
    const startX = position.x;
    const startY = position.y;
    const rect = container.getBoundingClientRect();
    const token = cancelToken;
    return animate(durationMs, (progress) => {
      const eased = easeInOutCubic(progress);
      position.x = lerp(startX, targetX, eased);
      position.y = lerp(startY, targetY, eased);
      applyCursorTransform();
      dispatchMoveWithRect(rect, position.x, position.y, buttons);
    }).then(() => {
      // One precise move at the destination: fresh rect + real hit test, so the
      // final hover is exact even if the cached rect went stale mid-glide.
      if (token !== cancelToken) return;
      dispatchPointer("pointermove", position.x, position.y, buttons);
    });
  };

  const pulseCursor = (durationMs = DEMO_CLICK_PULSE_MS): Promise<void> =>
    animate(durationMs, (progress) => {
      cursorScale = 1 - (1 - DEMO_CLICK_PULSE_MIN_SCALE) * Math.sin(progress * Math.PI);
      applyCursorTransform();
    });

  const click = async (x: number, y: number): Promise<void> => {
    const token = cancelToken;
    pointerMove(x, y);
    await pulseCursor();
    // cancel()/dispose() resolves the in-flight pulse; don't land the press
    // into a torn-down or freshly restarted showcase.
    if (token !== cancelToken) return;
    pointerDown(x, y);
    pointerUp(x, y);
  };

  // Press at the current point, glide to the target with the button held so
  // React Grab tracks a marquee drag-select, then release.
  const drag = async (toX: number, toY: number, durationMs: number): Promise<void> => {
    const token = cancelToken;
    pointerDown(position.x, position.y);
    await moveCursor(toX, toY, durationMs, 1);
    if (token !== cancelToken) return;
    pointerUp(position.x, position.y);
  };

  const pressKey = (key: string, target: EventTarget = elementAtCursor()): void => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true }),
    );
    target.dispatchEvent(
      new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true, composed: true }),
    );
  };

  const setInputValue = (input: GrabDemoInput, value: string): void => {
    const prototype =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, data: value }));
  };

  const typeText = async (
    text: string,
    target: GrabDemoInput,
    perCharMs = DEMO_TYPE_CHAR_MS,
  ): Promise<void> => {
    const token = cancelToken;
    for (const character of text) {
      if (token !== cancelToken) return;
      setInputValue(target, target.value + character);
      await wait(perCharMs);
    }
  };

  const centerOf = (element: Element): GrabDemoPoint => {
    const containerRect = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    };
  };

  const getShadowRoot = (): ShadowRoot | null =>
    document.querySelector(`[${REACT_GRAB_ATTRIBUTE_NAME}]`)?.shadowRoot ?? null;

  const getInput = (): GrabDemoInput | null => {
    const input = getShadowRoot()?.querySelector(`[${REACT_GRAB_INPUT_ATTRIBUTE}]`);
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) return input;
    return null;
  };

  const setCursorPosition = (x: number, y: number): void => {
    position.x = x;
    position.y = y;
    applyCursorTransform();
  };

  const showCursor = (): void => {
    cursorElement.style.opacity = "1";
  };

  const dispose = (): void => {
    cancel();
    cursorElement.remove();
    if (didPromoteContainerPosition) container.style.position = "";
    // api.dispose() runs init's cleanup, which clears the scope container.
    api.dispose();
  };

  return {
    api,
    showCursor,
    setCursorPosition,
    moveCursor,
    pulseCursor,
    click,
    drag,
    pressKey,
    typeText,
    setInputValue,
    syncPointer,
    centerOf,
    getInput,
    wait,
    cancel,
    dispose,
  };
};

declare global {
  interface Window {
    __REACT_GRAB_DEMO__?: { createGrabDemo: typeof createGrabDemo };
  }
}

if (typeof window !== "undefined") {
  window.__REACT_GRAB_DEMO__ = { createGrabDemo };
}

export type { GrabDemoOptions, GrabDemoController };
