import type { Component } from "solid-js";
import { IconCheck } from "./icons/icon-check.jsx";

interface CopiedPillProps {
  text: string;
}

// Static, non-interactive "copied" confirmation pill. Used for passive
// confirmations (e.g. the toolbar scan-trace toast) that only need to show a
// message, without the focus/keyboard/dismiss machinery of CompletionView.
export const CopiedPill: Component<CopiedPillProps> = (props) => {
  return (
    <div
      role="status"
      aria-live="polite"
      class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-fit h-fit max-w-[280px] rounded-full antialiased bg-[var(--rg-panel-bg)] [font-synthesis:none]"
    >
      <IconCheck size={14} aria-hidden="true" class="text-[var(--rg-text-primary-85)] shrink-0" />
      <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
        {props.text}
      </span>
    </div>
  );
};
