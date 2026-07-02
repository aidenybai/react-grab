"use client";

import { useEffect, useRef, useState } from "react";

const TYPE_CHAR_MS = 14;
const WORK_TICK_MS = 120;
const WORK_TOKENS_MIN_PER_TICK = 9;
const WORK_TOKENS_JITTER_PER_TICK = 34;
// Claude Code's bespoke "thinking" spinner: a star that grows, then shrinks.
const SPINNER_FRAMES = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
const CLAUDE_CORAL = "#F76038";
const TERMINAL_LINE_CLASS = "font-mono text-xs leading-relaxed";

export interface AgentTerminalController {
  getPromptElement: () => HTMLElement | null;
  paste: (reference: string) => void;
  typePrompt: (text: string) => Promise<void>;
  startWork: () => void;
  showDiff: (removedLine: string, addedLine: string) => void;
  finishWork: () => void;
  typeReply: (text: string) => Promise<void>;
  reset: () => void;
}

interface DiffContent {
  removedLine: string;
  addedLine: string;
}

export const AgentTerminal = ({
  controllerRef,
}: {
  controllerRef: React.RefObject<AgentTerminalController | null>;
}) => {
  const [chipText, setChipText] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [workPhase, setWorkPhase] = useState<"idle" | "working" | "done">("idle");
  const [workMs, setWorkMs] = useState(0);
  const [workTokens, setWorkTokens] = useState(0);
  const [spinnerStep, setSpinnerStep] = useState(0);
  const [diff, setDiff] = useState<DiffContent | null>(null);
  const [replyText, setReplyText] = useState("");
  const sessionRef = useRef(0);
  const workIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const promptRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stopWorkTicker = () => {
      if (workIntervalRef.current !== null) clearInterval(workIntervalRef.current);
      workIntervalRef.current = null;
    };

    const sleep = (durationMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, durationMs));

    const typeText = async (session: number, text: string, apply: (partial: string) => void) => {
      for (let charIndex = 1; charIndex <= text.length; charIndex += 1) {
        if (sessionRef.current !== session) return;
        apply(text.slice(0, charIndex));
        await sleep(TYPE_CHAR_MS);
      }
    };

    const clearTranscript = () => {
      stopWorkTicker();
      setChipText(null);
      setPromptText("");
      setIsBusy(false);
      setWorkPhase("idle");
      setWorkMs(0);
      setWorkTokens(0);
      setDiff(null);
      setReplyText("");
    };

    controllerRef.current = {
      getPromptElement: () => promptRowRef.current,
      paste: (reference) => {
        sessionRef.current += 1;
        clearTranscript();
        setChipText(reference);
        setIsBusy(true);
      },
      typePrompt: async (text) => {
        await typeText(sessionRef.current, text, setPromptText);
      },
      startWork: () => {
        setWorkPhase("working");
        const startedAt = Date.now();
        workIntervalRef.current = setInterval(() => {
          setSpinnerStep((previousStep) => previousStep + 1);
          setWorkMs(Date.now() - startedAt);
          setWorkTokens(
            (previousTokens) =>
              previousTokens +
              WORK_TOKENS_MIN_PER_TICK +
              Math.floor(Math.random() * WORK_TOKENS_JITTER_PER_TICK),
          );
        }, WORK_TICK_MS);
      },
      showDiff: (removedLine, addedLine) => {
        setDiff({ removedLine, addedLine });
      },
      finishWork: () => {
        stopWorkTicker();
        setWorkPhase("done");
      },
      typeReply: async (text) => {
        const session = sessionRef.current;
        await typeText(session, text, setReplyText);
        if (sessionRef.current !== session) return;
        setIsBusy(false);
      },
      reset: () => {
        sessionRef.current += 1;
        clearTranscript();
      },
    };

    return () => {
      sessionRef.current += 1;
      stopWorkTicker();
      controllerRef.current = null;
    };
  }, [controllerRef]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [promptText, workPhase, diff, replyText]);

  const isIdle = chipText === null;
  const workSeconds = Math.floor(workMs / 1000);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="relative flex h-10 items-center justify-center border-b border-line px-3">
        <div className="absolute left-3 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-line" />
        </div>
        <span className="font-mono text-xs text-faint">Terminal</span>
      </div>
      <div
        ref={bodyRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none px-3.5 py-3"
      >
        <div className="flex flex-col" style={{ color: CLAUDE_CORAL }}>
          <div className="flex items-stretch">
            <div
              className="w-3 shrink-0 rounded-tl-md border-t border-l"
              style={{ borderColor: CLAUDE_CORAL }}
            />
            <div className="-translate-y-1/2 px-1.5 font-mono text-[10px] leading-none">
              Claude Code
            </div>
            <div
              className="flex-1 rounded-tr-md border-t border-r"
              style={{ borderColor: CLAUDE_CORAL }}
            />
          </div>
          <div
            className="flex flex-col gap-0.5 rounded-b-md border-x border-b px-2.5 pt-1 pb-2 font-mono text-[11px] leading-relaxed"
            style={{ borderColor: CLAUDE_CORAL }}
          >
            <span className="text-ink">Opus 4.5</span>
            <span className="text-faint">~/Developer/app</span>
          </div>
        </div>

        <div ref={promptRowRef} className={TERMINAL_LINE_CLASS}>
          <span className="text-faint">&gt; </span>
          {isIdle && <span className="text-faint">Grab any element to paste it here.</span>}
          {chipText && (
            <span className="break-all rounded bg-code px-1 py-0.5 text-code-ink">{chipText}</span>
          )}
          {promptText && <span className="text-ink"> {promptText}</span>}
          {isBusy && <span className="animate-pulse text-ink">▌</span>}
        </div>

        {workPhase !== "idle" && (
          <p className={`${TERMINAL_LINE_CLASS} animate-in fade-in duration-300`}>
            {workPhase === "working" ? (
              <>
                <span style={{ color: CLAUDE_CORAL }}>
                  {SPINNER_FRAMES[spinnerStep % SPINNER_FRAMES.length]}
                </span>{" "}
                <span className="text-ink">Fixing…</span>{" "}
                <span className="text-faint">
                  ({workSeconds}s · ↓ {workTokens} tokens)
                </span>
              </>
            ) : (
              <span className="text-faint">✻ Cooked for {workSeconds}s</span>
            )}
          </p>
        )}

        {diff && (
          <div className="animate-in fade-in slide-in-from-bottom-1 overflow-hidden rounded border border-line font-mono text-[11px] leading-relaxed duration-300">
            <div className="whitespace-pre border-l-2 border-[#FF3B30] bg-[#FF3B3014] px-2 text-[#C9303C]">
              {diff.removedLine}
            </div>
            <div className="whitespace-pre border-l-2 border-[#34C759] bg-[#34C75914] px-2 text-[#1F8A43]">
              {diff.addedLine}
            </div>
          </div>
        )}

        {replyText && <p className={`${TERMINAL_LINE_CLASS} text-ink`}>✅ {replyText}</p>}
      </div>
    </div>
  );
};

AgentTerminal.displayName = "AgentTerminal";
