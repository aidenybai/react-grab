import { type Component } from "solid-js";
import { EDIT_LABEL_CLASS } from "../edit-panel/constants.js";
import { Input } from "../ui/input.js";

interface TextControlProps {
  label?: string;
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}

export const TextControl: Component<TextControlProps> = (props) => (
  <div class="flex items-center gap-2 w-full px-2 h-[20px]">
    {props.label && (
      <span class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}>
        {props.label}
      </span>
    )}
    <Input
      aria-label={props.label ?? "Text value"}
      placeholder={props.placeholder}
      class="ml-auto text-[12px] leading-4 font-medium text-right min-w-0 flex-1"
      style={{ "max-width": "140px" }}
      value={props.value}
      onInput={(event) => props.onCommit(event.currentTarget.value)}
      onKeyDown={(event) => event.stopImmediatePropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    />
  </div>
);
