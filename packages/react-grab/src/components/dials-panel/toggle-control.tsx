import { For, type Component } from "solid-js";
import { cn } from "../../utils/cn.js";
import { EDIT_LABEL_CLASS } from "../edit-panel/constants.js";

interface ToggleControlProps {
  label?: string;
  value: boolean;
  onCommit: (value: boolean) => void;
}

const SEGMENTS: ReadonlyArray<{ value: boolean; label: string }> = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
];

export const ToggleControl: Component<ToggleControlProps> = (props) => (
  <div class="flex items-center gap-2 w-full px-2 h-[20px]">
    {props.label && (
      <span class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}>
        {props.label}
      </span>
    )}
    <div class="ml-auto shrink-0 flex items-center gap-0.5 rounded-[6px] bg-[var(--rg-surface-hover)] p-0.5">
      <For each={SEGMENTS}>
        {(segment) => (
          <button
            type="button"
            data-react-grab-ignore-events
            aria-pressed={props.value === segment.value}
            class={cn(
              "px-1.5 py-px rounded-[4px] text-[11px] leading-4 font-medium cursor-pointer transition-colors press-scale",
              props.value === segment.value
                ? "bg-[var(--rg-surface-active)] text-[var(--rg-text-primary)]"
                : "text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)]",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onCommit(segment.value);
            }}
          >
            {segment.label}
          </button>
        )}
      </For>
    </div>
  </div>
);
