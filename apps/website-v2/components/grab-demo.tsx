"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GrabDemoController } from "react-grab/dist/demo.js";

const TRAVEL_MS = 850;
const DRAG_MS = 520;
const HOLD_MS = 1100;
const TYPE_CHAR_MS = 55;
const STEP_MS = 170;
const COMMENT_TEXT = "make this bigger";

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
    className={`absolute z-20 flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-transform hover:text-foreground active:scale-90 ${className}`}
  >
    {children}
  </button>
);

export const GrabDemo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<HTMLHeadingElement>(null);
  const demoRef = useRef<GrabDemoController | undefined>(undefined);
  const originalHtmlRef = useRef<string>("");
  const playingRef = useRef(false);
  // Bumped on every startPlaying so a stale loop (left awaiting after a fast
  // pause→play) bails instead of running alongside the new one.
  const loopIdRef = useRef(0);

  const [playing, setPlaying] = useState(false);

  // True only for the currently-owned play session. Re-checked after every
  // awaited step so pausing (or a newer loop) unwinds this one.
  const isActive = (loopId: number) => playingRef.current && loopIdRef.current === loopId;

  // Cursor rest spot: lower-right of the card, where a real hand would idle.
  const restPosition = () => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    return { x: container.clientWidth * 0.82, y: container.clientHeight * 0.8 };
  };

  // --- Showcase stages ---

  const stageSelectAndCopy = async (loopId: number) => {
    const demo = demoRef.current;
    const card = sampleRef.current;
    if (!demo || !card) return;
    demo.api.activate();
    const target = demo.centerOf(card);
    await demo.moveCursor(target.x, target.y, TRAVEL_MS);
    if (!isActive(loopId)) return;
    // Authentic grab: click the element so React Grab runs its real copy flow
    // and shows the "Copied" label.
    await demo.click(target.x, target.y);
    await demo.wait(HOLD_MS);
  };

  const stageDragSelect = async (loopId: number) => {
    const demo = demoRef.current;
    const container = containerRef.current;
    const card = sampleRef.current;
    if (!demo || !container || !card) return;
    demo.api.reset();
    demo.api.activate();
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const startX = cardRect.left - containerRect.left - 16;
    const startY = cardRect.top - containerRect.top - 16;
    const endX = cardRect.right - containerRect.left + 16;
    const endY = cardRect.bottom - containerRect.top + 16;

    await demo.moveCursor(startX, startY, TRAVEL_MS);
    if (!isActive(loopId)) return;
    await demo.drag(endX, endY, DRAG_MS);
    await demo.wait(HOLD_MS);
  };

  const stageComment = async (loopId: number) => {
    const demo = demoRef.current;
    const card = sampleRef.current;
    if (!demo || !card) return;
    demo.api.reset();
    demo.api.comment();
    const target = demo.centerOf(card);
    await demo.moveCursor(target.x, target.y, TRAVEL_MS);
    if (!isActive(loopId)) return;
    await demo.click(target.x, target.y);
    await demo.wait(400);
    if (!isActive(loopId)) return;

    const input = demo.getInput();
    if (input) {
      input.focus();
      for (const character of COMMENT_TEXT) {
        if (!isActive(loopId)) break;
        demo.setInputValue(input, input.value + character);
        await demo.wait(TYPE_CHAR_MS);
      }
    }
    await demo.wait(500);
    if (!isActive(loopId)) return;
    // Submit by "clicking" the selection, which commits the comment.
    await demo.moveCursor(target.x, target.y, 350);
    await demo.click(target.x, target.y);
    await demo.wait(HOLD_MS);
  };

  const stageTweak = async (loopId: number) => {
    const demo = demoRef.current;
    const card = sampleRef.current;
    if (!demo || !card) return;
    demo.api.reset();
    demo.api.activate();
    const target = demo.centerOf(card);
    await demo.moveCursor(target.x, target.y, TRAVEL_MS);
    if (!isActive(loopId)) return;
    await demo.click(target.x, target.y);
    // Type-to-edit: a bare keypress on the selected element opens the tweak panel.
    demo.pressKey("f");
    await demo.wait(450);
    const input = demo.getInput();
    if (!input) {
      await demo.wait(HOLD_MS);
      return;
    }
    // Search to a numeric property (it becomes the active row), then "slider-drag"
    // its value with the arrow keys — right steps it up, left steps it back.
    input.focus();
    demo.setInputValue(input, "font size");
    await demo.wait(550);
    input.focus();
    for (let step = 0; step < 10; step += 1) {
      if (!isActive(loopId)) break;
      demo.pressKey("ArrowRight", input);
      await demo.wait(STEP_MS);
    }
    await demo.wait(450);
    for (let step = 0; step < 5; step += 1) {
      if (!isActive(loopId)) break;
      demo.pressKey("ArrowLeft", input);
      await demo.wait(STEP_MS);
    }
    await demo.wait(HOLD_MS);
    demo.pressKey("Escape", input);
  };

  const runLoop = async (loopId: number) => {
    while (isActive(loopId)) {
      await stageSelectAndCopy(loopId);
      if (!isActive(loopId)) break;
      await stageDragSelect(loopId);
      if (!isActive(loopId)) break;
      await stageComment(loopId);
      if (!isActive(loopId)) break;
      await stageTweak(loopId);
      if (!isActive(loopId)) break;

      const demo = demoRef.current;
      if (!demo) break;
      demo.api.reset();
      const rest = restPosition();
      await demo.moveCursor(rest.x, rest.y, TRAVEL_MS);
      await demo.wait(700);
    }
  };

  const startPlaying = () => {
    if (playingRef.current) return;
    const demo = demoRef.current;
    if (!demo) return;
    playingRef.current = true;
    setPlaying(true);
    demo.showCursor();
    void runLoop(++loopIdRef.current);
  };

  const stopPlaying = () => {
    playingRef.current = false;
    setPlaying(false);
    // cancel() settles the in-flight wait/animation so the awaiting loop unwinds
    // and exits on its next playingRef check instead of starting a second loop.
    demoRef.current?.cancel();
    demoRef.current?.api.reset();
  };

  const togglePlaying = () => {
    if (playingRef.current) {
      stopPlaying();
    } else {
      startPlaying();
    }
  };

  const reset = () => {
    stopPlaying();
    if (sampleRef.current) sampleRef.current.innerHTML = originalHtmlRef.current;
    const demo = demoRef.current;
    if (demo) {
      demo.api.reset();
      const rest = restPosition();
      demo.setCursorPosition(rest.x, rest.y);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (sampleRef.current) originalHtmlRef.current = sampleRef.current.innerHTML;
    let disposed = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // React Grab's demo build ignores real user input, so the scripted cursor
    // can't be fought by stray clicks/keys. Loaded lazily because it's a
    // browser-only bundle that must not run during SSR.
    void import("react-grab/dist/demo.js").then(({ createGrabDemo }) => {
      if (disposed || !containerRef.current) return;
      const demo = createGrabDemo({ container: containerRef.current });
      demoRef.current = demo;
      const rest = restPosition();
      demo.setCursorPosition(rest.x, rest.y);
      if (!prefersReducedMotion) startPlaying();
    });

    return () => {
      disposed = true;
      playingRef.current = false;
      demoRef.current?.dispose();
      demoRef.current = undefined;
    };
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="relative flex aspect-3/2 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card text-center"
      >
        <h1
          ref={sampleRef}
          className="-translate-y-10 text-4xl font-semibold tracking-tight text-foreground"
        >
          React Grab
        </h1>
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
