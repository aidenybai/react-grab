"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GrabDemoController } from "react-grab/dist/demo.js";
import type { ElementSelectedEventDetail, SelectedElementPayload } from "react-grab";
import { AgentTerminal, type AgentTerminalController } from "@/components/agent-terminal";
import { TrafficLights } from "@/components/traffic-lights";
import { formatElementReference } from "@/lib/element-reference";

const TRAVEL_MS = 850;
const HOVER_SETTLE_MS = 350;
const COPY_SETTLE_MS = 700;
const REVEAL_MS = 450;
const PASTE_SETTLE_MS = 450;
const PRE_SUBMIT_MS = 550;
const WORK_BEFORE_DIFF_MS = 1600;
const WORK_AFTER_DIFF_MS = 800;
const DONE_HOLD_MS = 1600;
const REST_PAUSE_MS = 700;
const RELOAD_MS = 700;
const OVERLAY_DISMISS_MS = 350;
const REST_X_RATIO = 0.28;
const REST_Y_RATIO = 0.72;
const EDITED_HEADLINE_FONT_SIZE_PX = 52;
const PROMPT_TEXT = "make this bigger";
const DIFF_REMOVED_LINE = '- <h1 className="text-[39px]">';
const DIFF_ADDED_LINE = '+ <h1 className="text-[52px]">';

// Thrown by step() when the loop is paused or superseded; runLoop treats it as
// a clean unwind, so runStory reads as a linear storyboard without a
// cancellation check after every beat.
const LOOP_CANCELLED = Symbol("loop-cancelled");

// Only shown if the real react-grab:element-selected event never fired; the
// location is illustrative, not load-bearing.
const FALLBACK_GRABBED_ELEMENT: SelectedElementPayload = {
  tagName: "h1",
  componentName: "GrabDemo",
  filePath: "components/grab-demo.tsx",
  lineNumber: 361,
  columnNumber: 13,
};

// Below md the terminal floats over the browser stage; at md+ it sits beside
// it and reveals by animating its width (the inner panel is right-anchored so
// it emerges edge-first).
const TERMINAL_OVERLAY_CLASS =
  "absolute inset-x-3 bottom-14 z-10 h-44 drop-shadow-xl transition-[opacity,transform] duration-300 ease-out";
const TERMINAL_SIDEBAR_CLASS =
  "md:relative md:inset-x-auto md:bottom-auto md:z-auto md:h-auto md:translate-y-0 md:opacity-100 md:drop-shadow-none md:shrink-0 md:overflow-hidden md:transition-[width] md:duration-[450ms]";

interface RoundButtonProps {
  label: string;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}

const RoundButton = ({ label, className, onClick, children }: RoundButtonProps) => (
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
  const browserPanelRef = useRef<HTMLDivElement>(null);
  const terminalWrapperRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<HTMLHeadingElement>(null);
  const demoRef = useRef<GrabDemoController | undefined>(undefined);
  const terminalRef = useRef<AgentTerminalController | null>(null);
  const lastGrabbedElementRef = useRef<SelectedElementPayload | null>(null);
  const playingRef = useRef(false);
  // Bumped on every startPlaying so a stale loop (left awaiting after a fast
  // pause→play) bails instead of running alongside the new one.
  const loopIdRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [isHeadlineEdited, setIsHeadlineEdited] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isTerminalRevealed, setIsTerminalRevealed] = useState(false);
  const isTerminalRevealedRef = useRef(false);

  // The async loop reads the ref (state snapshots go stale across awaits);
  // JSX reads the state. One setter keeps the pair in lockstep.
  const setTerminalRevealed = (isRevealed: boolean) => {
    isTerminalRevealedRef.current = isRevealed;
    setIsTerminalRevealed(isRevealed);
  };

  // True only for the currently-owned play session. Re-checked after every
  // awaited step so pausing (or a newer loop) unwinds this one.
  const isActive = (loopId: number) => playingRef.current && loopIdRef.current === loopId;

  // Where a real hand would idle between runs.
  const restPosition = () => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    return { x: container.clientWidth * REST_X_RATIO, y: container.clientHeight * REST_Y_RATIO };
  };

  // The terminal is in overlay (floating) mode whenever its wrapper is
  // absolutely positioned — the same fact the responsive classes encode, so
  // the choreography can't desync from a breakpoint retune.
  const isTerminalOverlaying = () => {
    const wrapper = terminalWrapperRef.current;
    return Boolean(wrapper && getComputedStyle(wrapper).position === "absolute");
  };

  // One coherent loop, mirroring the real workflow: grab the headline, paste
  // it into the agent terminal, prompt, watch the agent read and edit the
  // file, and see the headline change as if the edit hot-reloaded.
  const runStory = async (loopId: number) => {
    const demo = demoRef.current;
    const card = sampleRef.current;
    const terminal = terminalRef.current;
    // Bailing with a plain return would let the while in runLoop spin hot.
    if (!demo || !card || !terminal) throw LOOP_CANCELLED;

    // Awaits an action, then unwinds the whole story if the loop was paused or
    // superseded while it ran.
    const step = async (action: Promise<unknown> | void) => {
      await action;
      if (!isActive(loopId)) throw LOOP_CANCELLED;
    };

    const target = demo.centerOf(card);
    await step(demo.moveCursor(target.x, target.y, TRAVEL_MS));
    // Activate only once the cursor is already over the headline; activating
    // before the travel would flash a hover highlight across everything the
    // cursor passes (including the whole container).
    demo.api.activate();
    demo.syncPointer();
    await step(demo.wait(HOVER_SETTLE_MS));
    // Authentic grab: click the element so React Grab runs its real copy flow
    // and shows the "Copied" label.
    await step(demo.click(target.x, target.y));
    await step(demo.wait(COPY_SETTLE_MS));

    // Copy done: drop the overlay before leaving the browser window so the
    // hover highlight doesn't chase the cursor across the terminal.
    demo.api.reset();
    if (!isTerminalRevealedRef.current) {
      setTerminalRevealed(true);
      await step(demo.wait(REVEAL_MS));
    }

    // The cursor carries the grab across windows and clicks the prompt.
    const promptElement = terminal.getPromptElement();
    if (promptElement) {
      const promptTarget = demo.centerOf(promptElement);
      await step(demo.moveCursor(promptTarget.x, promptTarget.y, TRAVEL_MS));
      await step(demo.pulseCursor());
    }

    const grabbed = lastGrabbedElementRef.current ?? FALLBACK_GRABBED_ELEMENT;
    terminal.paste(formatElementReference(grabbed));
    await step(demo.wait(PASTE_SETTLE_MS));

    await step(terminal.typePrompt(PROMPT_TEXT));
    await step(demo.wait(PRE_SUBMIT_MS));

    // Prompt submitted: the cursor steps back toward the browser window to
    // watch the agent's edit land.
    terminal.startWork();
    const rest = restPosition();
    await step(demo.moveCursor(rest.x, rest.y, TRAVEL_MS));
    await step(demo.wait(WORK_BEFORE_DIFF_MS));

    // In overlay mode the terminal covers the stage, so it dips away before
    // the edit lands — otherwise it would hide the growing headline. It
    // re-reveals on the next loop's grab.
    if (isTerminalOverlaying()) {
      setTerminalRevealed(false);
      await step(demo.wait(OVERLAY_DISMISS_MS));
    }

    terminal.showDiff(DIFF_REMOVED_LINE, DIFF_ADDED_LINE);
    // The agent's edit "hot-reloads": the headline grows in the browser pane.
    setIsHeadlineEdited(true);
    await step(demo.wait(WORK_AFTER_DIFF_MS));

    terminal.finishWork();
    await step(terminal.typeReply("The headline is bigger now."));
    await step(demo.wait(DONE_HOLD_MS));

    // Loop restart plays as a page reload: the blue load bar sweeps across,
    // the headline reverts, and the terminal clears for a fresh session.
    terminal.reset();
    setIsHeadlineEdited(false);
    setIsReloading(true);
    await demo.wait(RELOAD_MS);
    setIsReloading(false);
    await step(demo.wait(REST_PAUSE_MS));
  };

  const runLoop = async (loopId: number) => {
    try {
      while (isActive(loopId)) {
        await runStory(loopId);
      }
    } catch (thrown) {
      if (thrown !== LOOP_CANCELLED) throw thrown;
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
    // and exits on its next step() check instead of starting a second loop.
    demoRef.current?.cancel();
    demoRef.current?.api.reset();
    // Otherwise a pause (or scroll-away auto-pause) mid-story leaves the work
    // ticker and typing animations running indefinitely off-screen.
    terminalRef.current?.pause();
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
    terminalRef.current?.reset();
    setIsHeadlineEdited(false);
    setIsReloading(false);
    setTerminalRevealed(false);
    const demo = demoRef.current;
    if (demo) {
      demo.api.reset();
      const rest = restPosition();
      demo.setCursorPosition(rest.x, rest.y);
      startPlaying();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The scripted click runs React Grab's real copy flow, which dispatches
    // this event with the element's real source location — captured here so
    // the terminal pastes the same reference a real grab would produce.
    const handleElementSelected = (event: CustomEvent<ElementSelectedEventDetail>) => {
      const firstElement = event.detail?.elements?.[0];
      if (firstElement) lastGrabbedElementRef.current = firstElement;
    };
    window.addEventListener("react-grab:element-selected", handleElementSelected);

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
          // The cursor roams the whole wrapper (browser + terminal), but the
          // grab surface — and the toolbar it anchors — is the browser window.
          const demo = createGrabDemo({
            container: containerRef.current,
            scopeContainer: browserPanelRef.current ?? undefined,
          });
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
      window.removeEventListener("react-grab:element-selected", handleElementSelected);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (scrollFrameId !== null) cancelAnimationFrame(scrollFrameId);
      demoRef.current?.dispose();
      demoRef.current = undefined;
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex w-full flex-col md:flex-row md:items-stretch">
        <div
          ref={browserPanelRef}
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line"
        >
          <div className="relative flex h-10 items-center gap-1.5 border-b border-line px-3">
            <TrafficLights />
            <span className="absolute left-1/2 -translate-x-1/2 rounded border border-line px-6 py-0.5 font-mono text-xs text-faint">
              localhost:3000
            </span>
            {isReloading && (
              <span className="absolute bottom-0 left-0 h-0.5 animate-reload-bar bg-[#0a84ff]" />
            )}
          </div>
          <div className="paper-hatch relative flex aspect-square w-full items-center justify-center overflow-hidden text-center md:aspect-auto md:h-72">
            {/* Below md the terminal overlays the lower half of the stage, so
                the headline sits higher to stay visible above it. */}
            <h1
              ref={sampleRef}
              className="-translate-y-28 font-serif text-display tracking-tight text-title transition-[font-size] duration-500 ease-out md:-translate-y-4"
              style={
                isHeadlineEdited ? { fontSize: `${EDITED_HEADLINE_FONT_SIZE_PX}px` } : undefined
              }
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

        {/* The terminal appears on the first grab: floating over the stage
            below md, sliding out beside the browser at md+. */}
        <div
          ref={terminalWrapperRef}
          className={`${TERMINAL_OVERLAY_CLASS} ${TERMINAL_SIDEBAR_CLASS} ${
            isTerminalRevealed
              ? "translate-y-0 opacity-100 md:w-[18.75rem]"
              : "pointer-events-none translate-y-4 opacity-0 md:pointer-events-auto md:w-0"
          }`}
        >
          <div className="h-full w-full md:absolute md:top-0 md:right-0 md:w-72">
            <AgentTerminal controllerRef={terminalRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Production minification mangles the function name (the grab label would read
// "S.h1"), and displayName survives it.
GrabDemo.displayName = "GrabDemo";
