"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactGrabAPI } from "react-grab";

let sharedAudioContext: AudioContext | null = null;

// A short filtered-noise burst — a mechanical "click" rather than a tonal beep.
const playTick = (up: boolean) => {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  sharedAudioContext ??= new AudioContextClass();
  const context = sharedAudioContext;
  if (context.state === "suspended") void context.resume();

  const durationSeconds = 0.035;
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    const decay = (1 - index / sampleCount) ** 3;
    samples[index] = (Math.random() * 2 - 1) * decay;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  const bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = up ? 2600 : 1900;
  bandpass.Q.value = 0.7;
  const gain = context.createGain();
  gain.gain.value = 0.3;
  source.connect(bandpass).connect(gain).connect(context.destination);
  source.start();
  source.stop(context.currentTime + durationSeconds);
};

// The pointer tip sits near the top-left of the 19×26 artwork; offset the
// element so the tip — not the bounding box — lands on the animation target.
const CURSOR_TIP_X = 5;
const CURSOR_TIP_Y = 4;
const TRAVEL_MS = 850;
const HOLD_MS = 1100;
const CLICK_MS = 220;
const TYPE_CHAR_MS = 55;
const GRAB_ATTR = "data-react-grab";
const COMMENT_TEXT = "make this bigger";

const easeInOutCubic = (progress: number): number =>
  progress < 0.5 ? 4 * progress * progress * progress : 1 - (-2 * progress + 2) ** 3 / 2;

const Cursor = ({ ref }: { ref: React.Ref<HTMLDivElement> }) => (
  <div
    ref={ref}
    aria-hidden="true"
    className="pointer-events-none absolute top-0 left-0 z-10 opacity-0 transition-opacity duration-300 will-change-transform"
  >
    <svg width="19" height="26" viewBox="0 0 19 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#cursor-shadow)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.501 4.2601L13.884 12.6611C14.937 13.7171 14.19 15.5191 12.699 15.5191L11.475 15.519L12.6908 18.4067C12.9038 18.9127 12.9068 19.4727 12.6998 19.9817C12.4918 20.4917 12.0978 20.8897 11.5898 21.1027C11.3338 21.2097 11.0658 21.2637 10.7918 21.2637C9.9608 21.2637 9.2158 20.7687 8.8938 20.0027L7.616 16.965L6.784 17.7031C5.703 18.6591 4 17.8921 4 16.4481V4.8811C4 4.0971 4.947 3.7051 5.501 4.2601Z"
          fill="white"
        />
      </g>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.99951 5.5292C4.99951 5.3982 5.15851 5.3322 5.25051 5.4252L13.1585 13.3502C13.5895 13.7822 13.2835 14.5192 12.6735 14.5192L9.96951 14.5177L11.7691 18.7936C11.9961 19.3336 11.7421 19.9546 11.2031 20.1806C10.6621 20.4076 10.0421 20.1546 9.81611 19.6156L7.99851 15.2917L6.13851 16.9392C5.72251 17.3072 5.08063 17.0507 5.00655 16.5274L4.99951 16.4262V5.5292Z"
        fill="black"
      />
      <defs>
        <filter
          id="cursor-shadow"
          x="0"
          y="0"
          width="18.3766"
          height="25.2637"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  </div>
);

const RoundButton = ({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    data-demo-control=""
    className={`absolute z-20 flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-transform hover:text-foreground active:scale-90 ${className}`}
  >
    {children}
  </button>
);

export const GrabDemo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<HTMLHeadingElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReactGrabAPI | undefined>(undefined);
  const originalHtmlRef = useRef<string>("");

  const playingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const pendingResolveRef = useRef<(() => void) | null>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const [playing, setPlaying] = useState(false);

  const tick = (up: boolean) => {
    playTick(up);
  };

  const applyCursorTransform = () => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const { x, y } = positionRef.current;
    cursor.style.transform = `translate3d(${x - CURSOR_TIP_X}px, ${y - CURSOR_TIP_Y}px, 0) scale(${scaleRef.current})`;
  };

  const restPosition = () => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    return { x: container.clientWidth * 0.82, y: container.clientHeight * 0.8 };
  };

  // Container-relative center of an element.
  const centerOf = (element: Element | null) => {
    const container = containerRef.current;
    if (!container || !element) return restPosition();
    const containerRect = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    };
  };

  // Convert a container-relative point to viewport (client) coordinates for
  // synthetic DOM events, which is how React Grab actually reads the pointer.
  const toClient = (x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return { clientX: x, clientY: y };
    const containerRect = container.getBoundingClientRect();
    return { clientX: containerRect.left + x, clientY: containerRect.top + y };
  };

  const firePointer = (type: string, x: number, y: number, buttons = 0) => {
    const { clientX, clientY } = toClient(x, y);
    const target = document.elementFromPoint(clientX, clientY) ?? document.body;
    target.dispatchEvent(
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
      }),
    );
  };

  const clearTimers = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
    // Settle any in-flight wait/moveTo/clickPulse so the awaiting loop unwinds
    // and exits on its next playingRef check instead of hanging forever (which
    // would also let a second loop start on resume).
    const resolvePending = pendingResolveRef.current;
    pendingResolveRef.current = null;
    resolvePending?.();
  };

  const wait = (durationMs: number): Promise<void> =>
    new Promise((resolve) => {
      pendingResolveRef.current = resolve;
      timeoutRef.current = window.setTimeout(resolve, durationMs);
    });

  const moveTo = (targetX: number, targetY: number, durationMs: number): Promise<void> =>
    new Promise((resolve) => {
      pendingResolveRef.current = resolve;
      const startX = positionRef.current.x;
      const startY = positionRef.current.y;
      const startTime = performance.now();
      const frame = (now: number) => {
        if (!playingRef.current) {
          resolve();
          return;
        }
        const progress = Math.min(1, (now - startTime) / durationMs);
        const eased = easeInOutCubic(progress);
        positionRef.current.x = startX + (targetX - startX) * eased;
        positionRef.current.y = startY + (targetY - startY) * eased;
        applyCursorTransform();
        // Drive React Grab's hover detection along the path.
        firePointer("pointermove", positionRef.current.x, positionRef.current.y);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    });

  const clickPulse = (): Promise<void> =>
    new Promise((resolve) => {
      pendingResolveRef.current = resolve;
      const startTime = performance.now();
      const frame = (now: number) => {
        if (!playingRef.current) {
          scaleRef.current = 1;
          applyCursorTransform();
          resolve();
          return;
        }
        const progress = Math.min(1, (now - startTime) / CLICK_MS);
        scaleRef.current = 1 - 0.2 * Math.sin(progress * Math.PI);
        applyCursorTransform();
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          scaleRef.current = 1;
          applyCursorTransform();
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    });

  const moveToElement = (element: Element | null, durationMs = TRAVEL_MS) => {
    const target = centerOf(element);
    return moveTo(target.x, target.y, durationMs);
  };

  const findTextarea = (): HTMLTextAreaElement | null => {
    const host = document.querySelector(`[${GRAB_ATTR}]`);
    return host?.shadowRoot?.querySelector("textarea") ?? null;
  };

  const typeComment = async (text: string) => {
    const textarea = findTextarea();
    if (!textarea) return;
    textarea.focus();
    for (const character of text) {
      if (!playingRef.current) return;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(textarea, textarea.value + character);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      tick(true);
      await wait(TYPE_CHAR_MS);
    }
  };

  const fireKey = (key: string) => {
    const { clientX, clientY } = toClient(positionRef.current.x, positionRef.current.y);
    const target = document.elementFromPoint(clientX, clientY) ?? document.body;
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true }),
    );
  };

  // The edit panel's search field is a <textarea data-react-grab-input>.
  const editSearchInput = (): HTMLTextAreaElement | null => {
    const host = document.querySelector(`[${GRAB_ATTR}]`);
    return host?.shadowRoot?.querySelector("[data-react-grab-input]") ?? null;
  };

  const fireKeyOn = (element: Element, key: string) => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true, composed: true }),
    );
  };

  const setInputValue = (input: HTMLTextAreaElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, data: value }));
  };

  // --- Showcase stages ---

  const stageSelectAndCopy = async () => {
    apiRef.current?.activate();
    await moveToElement(sampleRef.current);
    if (!playingRef.current) return;
    await clickPulse();
    // Authentic grab: click the selected element so React Grab runs its real
    // copy flow and shows the "Copied" label.
    const center = centerOf(sampleRef.current);
    firePointer("pointermove", center.x, center.y);
    firePointer("pointerdown", center.x, center.y, 1);
    firePointer("pointerup", center.x, center.y, 0);
    tick(true);
    await wait(HOLD_MS);
  };

  const stageDragSelect = async () => {
    apiRef.current?.reset();
    apiRef.current?.activate();
    const container = containerRef.current;
    const card = sampleRef.current;
    if (!container || !card) return;
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const startX = cardRect.left - containerRect.left - 16;
    const startY = cardRect.top - containerRect.top - 16;
    const endX = cardRect.right - containerRect.left + 16;
    const endY = cardRect.bottom - containerRect.top + 16;

    await moveTo(startX, startY, TRAVEL_MS);
    if (!playingRef.current) return;
    firePointer("pointerdown", startX, startY, 1);
    const steps = 18;
    for (let step = 1; step <= steps; step += 1) {
      if (!playingRef.current) break;
      const eased = easeInOutCubic(step / steps);
      const x = startX + (endX - startX) * eased;
      const y = startY + (endY - startY) * eased;
      positionRef.current.x = x;
      positionRef.current.y = y;
      applyCursorTransform();
      firePointer("pointermove", x, y, 1);
      await wait(28);
    }
    firePointer("pointerup", endX, endY, 0);
    tick(true);
    await wait(HOLD_MS);
  };

  const stageComment = async () => {
    apiRef.current?.reset();
    apiRef.current?.comment();
    await moveToElement(sampleRef.current);
    if (!playingRef.current) return;
    await clickPulse();
    const { x, y } = positionRef.current;
    firePointer("pointermove", x, y);
    firePointer("pointerdown", x, y, 1);
    firePointer("pointerup", x, y, 0);
    await wait(400);
    if (!playingRef.current) return;
    await typeComment(COMMENT_TEXT);
    await wait(500);
    // Submit by "clicking" the selection, which commits the comment.
    const target = centerOf(sampleRef.current);
    await moveTo(target.x, target.y, 350);
    await clickPulse();
    firePointer("pointerdown", target.x, target.y, 1);
    firePointer("pointerup", target.x, target.y, 0);
    tick(true);
    await wait(HOLD_MS);
  };

  const stageTweak = async () => {
    apiRef.current?.reset();
    apiRef.current?.activate();
    await moveToElement(sampleRef.current);
    if (!playingRef.current) return;
    await clickPulse();
    // Type-to-edit: a bare keypress on the selected element opens the tweak panel.
    fireKey("f");
    await wait(450);
    const input = editSearchInput();
    if (!input) {
      await wait(HOLD_MS);
      return;
    }
    // Search to a numeric property (it becomes the active row), then
    // "slider-drag" its value with the arrow keys — left/right steps the value.
    input.focus();
    setInputValue(input, "font size");
    await wait(550);
    input.focus();
    for (let step = 0; step < 10; step += 1) {
      if (!playingRef.current) break;
      fireKeyOn(input, "ArrowRight");
      tick(true);
      await wait(170);
    }
    await wait(450);
    for (let step = 0; step < 5; step += 1) {
      if (!playingRef.current) break;
      fireKeyOn(input, "ArrowLeft");
      tick(false);
      await wait(170);
    }
    await wait(HOLD_MS);
    fireKeyOn(input, "Escape");
  };

  const runLoop = async () => {
    while (playingRef.current) {
      await stageSelectAndCopy();
      if (!playingRef.current) break;
      await stageDragSelect();
      if (!playingRef.current) break;
      await stageComment();
      if (!playingRef.current) break;
      await stageTweak();
      if (!playingRef.current) break;

      apiRef.current?.reset();
      const rest = restPosition();
      await moveTo(rest.x, rest.y, TRAVEL_MS);
      await wait(700);
    }
  };

  const startPlaying = () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    if (cursorRef.current) cursorRef.current.style.opacity = "1";
    void runLoop();
  };

  const stopPlaying = () => {
    playingRef.current = false;
    setPlaying(false);
    clearTimers();
    scaleRef.current = 1;
    applyCursorTransform();
    apiRef.current?.reset();
  };

  const togglePlaying = () => {
    if (playingRef.current) {
      stopPlaying();
      tick(false);
    } else {
      startPlaying();
    }
  };

  const reset = () => {
    stopPlaying();
    if (sampleRef.current) sampleRef.current.innerHTML = originalHtmlRef.current;
    apiRef.current?.reset();
    const rest = restPosition();
    positionRef.current = rest;
    applyCursorTransform();
    tick(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (sampleRef.current) originalHtmlRef.current = sampleRef.current.innerHTML;
    positionRef.current = restPosition();
    applyCursorTransform();
    let disposed = false;

    // Real user input is ignored by React Grab's `demo` mode below, so the
    // scripted cursor can't be fought by stray clicks/keys - no manual swallow.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void import("react-grab/core").then(({ init }) => {
      if (disposed || !containerRef.current) return;
      apiRef.current = init({ container: containerRef.current, demo: true });
      if (!prefersReducedMotion) startPlaying();
    });

    return () => {
      disposed = true;
      playingRef.current = false;
      clearTimers();
      apiRef.current?.dispose();
      apiRef.current = undefined;
    };
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className={`relative flex aspect-3/2 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card text-center ${playing ? "cursor-none select-none" : ""}`}
      >
        <h1
          ref={sampleRef}
          className="-translate-y-10 text-4xl font-semibold tracking-tight text-foreground"
        >
          React Grab
        </h1>

        <Cursor ref={cursorRef} />
      </div>

      <RoundButton label="Reset" className="bottom-3 left-3" onClick={reset}>
        <RotateCcw size={16} />
      </RoundButton>

      <RoundButton
        label={playing ? "Pause" : "Play"}
        className="bottom-3 right-3"
        onClick={togglePlaying}
      >
        {playing ? (
          <Pause size={16} fill="currentColor" stroke="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" stroke="currentColor" />
        )}
      </RoundButton>
    </div>
  );
};
