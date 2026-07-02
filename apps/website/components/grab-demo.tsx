"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GrabDemoController } from "react-grab/dist/demo.js";

const TRAVEL_MS = 850;
const DRAG_MS = 520;
const HOLD_MS = 1100;
const STEP_MS = 170;
const COMMENT_OPEN_MS = 400;
const PRE_SUBMIT_MS = 500;
const SUBMIT_TRAVEL_MS = 350;
const EDIT_OPEN_MS = 450;
const SEARCH_SETTLE_MS = 550;
const STEP_REVERSE_PAUSE_MS = 450;
const REST_PAUSE_MS = 700;
const REST_X_RATIO = 0.82;
const REST_Y_RATIO = 0.8;
const DRAG_PADDING_PX = 16;
const TWEAK_UP_STEPS = 10;
const TWEAK_DOWN_STEPS = 5;
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
    className={`absolute z-20 flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-faint transition-transform hover:text-ink active:scale-90 ${className}`}
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

  // Where a real hand would idle between runs.
  const restPosition = () => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    return { x: container.clientWidth * REST_X_RATIO, y: container.clientHeight * REST_Y_RATIO };
  };

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
    if (!isActive(loopId)) return;
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
    const startX = cardRect.left - containerRect.left - DRAG_PADDING_PX;
    const startY = cardRect.top - containerRect.top - DRAG_PADDING_PX;
    const endX = cardRect.right - containerRect.left + DRAG_PADDING_PX;
    const endY = cardRect.bottom - containerRect.top + DRAG_PADDING_PX;

    await demo.moveCursor(startX, startY, TRAVEL_MS);
    if (!isActive(loopId)) return;
    await demo.drag(endX, endY, DRAG_MS);
    if (!isActive(loopId)) return;
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
    await demo.wait(COMMENT_OPEN_MS);
    if (!isActive(loopId)) return;

    const input = demo.getInput();
    if (input) await demo.typeText(COMMENT_TEXT, input);
    if (!isActive(loopId)) return;
    await demo.wait(PRE_SUBMIT_MS);
    if (!isActive(loopId)) return;
    // Submit by "clicking" the selection, which commits the comment.
    await demo.moveCursor(target.x, target.y, SUBMIT_TRAVEL_MS);
    if (!isActive(loopId)) return;
    await demo.click(target.x, target.y);
    if (!isActive(loopId)) return;
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
    // No real click here: the element stays hovered (not copied) so the bare
    // keypress below opens type-to-edit on it instead of running the copy flow.
    await demo.pulseCursor();
    if (!isActive(loopId)) return;
    demo.pressKey("f");
    await demo.wait(EDIT_OPEN_MS);
    if (!isActive(loopId)) return;
    const input = demo.getInput();
    if (!input) {
      await demo.wait(HOLD_MS);
      return;
    }
    // Search to a numeric property (it becomes the active row), then "slider-drag"
    // its value with the arrow keys — right steps it up, left steps it back.
    // Alt opts out of design-token snapping: a bare arrow would walk the token
    // ladder (39 → 22 → 15) and visibly collapse the headline mid-demo.
    demo.setInputValue(input, "font size");
    await demo.wait(SEARCH_SETTLE_MS);
    if (!isActive(loopId)) return;
    for (let step = 0; step < TWEAK_UP_STEPS; step += 1) {
      if (!isActive(loopId)) break;
      demo.pressKey("ArrowRight", input, { altKey: true });
      await demo.wait(STEP_MS);
    }
    await demo.wait(STEP_REVERSE_PAUSE_MS);
    if (!isActive(loopId)) return;
    for (let step = 0; step < TWEAK_DOWN_STEPS; step += 1) {
      if (!isActive(loopId)) break;
      demo.pressKey("ArrowLeft", input, { altKey: true });
      await demo.wait(STEP_MS);
    }
    await demo.wait(HOLD_MS);
    if (!isActive(loopId)) return;
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
      if (!isActive(loopId)) break;
      await demo.wait(REST_PAUSE_MS);
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
    const container = containerRef.current;
    if (!container) return;
    if (sampleRef.current) originalHtmlRef.current = sampleRef.current.innerHTML;
    let disposed = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // React Grab tracks the pointer in viewport space, so a page scroll leaves
    // its hover latched onto whatever slid under the cursor's old client point.
    // The demo cursor is anchored to the container (it scrolls with the page), so
    // re-emitting a pointer move at its current point re-glues the hover to the
    // right element. rAF-coalesced so a scroll burst dispatches at most once/frame;
    // gated on playingRef so idle/paused states pay nothing on scroll.
    let scrollFrameId: number | null = null;
    const handleScroll = () => {
      if (!playingRef.current) return;
      if (scrollFrameId !== null) return;
      scrollFrameId = requestAnimationFrame(() => {
        scrollFrameId = null;
        demoRef.current?.syncPointer();
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    // React Grab's demo build ignores real user input, so the scripted cursor
    // can't be fought by stray clicks/keys. Loaded lazily because it's a
    // browser-only bundle that must not run during SSR — and only once the card
    // is actually visible, so visitors who never reach it don't pay for it.
    // Pause the loop while the card is off-screen (no point dispatching
    // synthetic events nobody can see) and resume on return. Only auto-resume
    // what auto-pause stopped, so a manual pause sticks across scrolling.
    let didAutoPause = false;
    let isCardVisible = false;

    let loadStarted = false;
    const loadDemo = () => {
      if (loadStarted) return;
      loadStarted = true;
      import("react-grab/dist/demo.js")
        .then(({ createGrabDemo }) => {
          if (disposed || !containerRef.current) return;
          const demo = createGrabDemo({ container: containerRef.current });
          demoRef.current = demo;
          const rest = restPosition();
          demo.setCursorPosition(rest.x, rest.y);
          if (prefersReducedMotion) return;
          // The import can resolve after the card has already been scrolled
          // back out of view; defer to the observer's auto-resume in that case.
          if (isCardVisible) {
            startPlaying();
          } else {
            didAutoPause = true;
          }
        })
        .catch((error) => {
          console.error("[react-grab] failed to load demo bundle; run `pnpm build:demo`", error);
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        isCardVisible = entry.isIntersecting;
        if (entry.isIntersecting) {
          loadDemo();
          if (didAutoPause) {
            didAutoPause = false;
            startPlaying();
          }
        } else if (playingRef.current) {
          didAutoPause = true;
          stopPlaying();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(container);

    return () => {
      disposed = true;
      playingRef.current = false;
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (scrollFrameId !== null) cancelAnimationFrame(scrollFrameId);
      demoRef.current?.dispose();
      demoRef.current = undefined;
    };
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="paper-hatch relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-line text-center sm:aspect-[2/1]"
      >
        <h1
          ref={sampleRef}
          className="-translate-y-4 font-serif text-display tracking-tight text-title"
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
