import type { Component } from "solid-js";
import { FADE_DURATION_MS, FEEDBACK_DURATION_MS, PANEL_SHADOW } from "../constants.js";
import { IconCheck } from "./icons/icon-check.jsx";

interface CopiedPillProps {
  text: string;
}

// Static, non-interactive "copied" confirmation pill for passive confirmations
// (e.g. the toolbar scan-trace toast). It appears instantly, holds, then fades
// itself out over its final FADE_DURATION_MS - the same dismissal the selection
// label uses - so the parent only needs to mount/unmount it.
export const CopiedPill: Component<CopiedPillProps> = (props) => {
  return (
    <div
      role="status"
      aria-live="polite"
      class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-fit h-fit max-w-[280px] rounded-full antialiased bg-[var(--rg-panel-bg)] [font-synthesis:none]"
      style={{
        filter: `drop-shadow(${PANEL_SHADOW})`,
        animation: `rg-copied-pill-out ${FADE_DURATION_MS}ms ease-out ${FEEDBACK_DURATION_MS - FADE_DURATION_MS}ms forwards`,
      }}
    >
      <IconCheck size={14} aria-hidden="true" class="text-[var(--rg-text-primary-85)] shrink-0" />
      <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
        {props.text}
      </span>
    </div>
  );
};
