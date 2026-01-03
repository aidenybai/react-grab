import { Show } from "solid-js";
import type { Component } from "solid-js";
import type { ActionPillProps } from "../../types.js";
import { cn } from "../../utils/cn.js";

export const ActionPill: Component<ActionPillProps> = (props) => {
  const labelPrefix = () => {
    if (props.isEditing) return null;
    return "Click to ";
  };

  const labelAction = () => {
    if (props.isEditing) return "Editing";
    return "Copy";
  };

  return (
    <div
      class={cn(
        "contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-sm gap-[3px]",
        props.asButton && "cursor-pointer",
        props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
      )}
      role="button"
      onClick={props.onClick}
    >
      <div class="text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
        <Show when={labelPrefix()}>
          <span class="text-[#a0a0a0]">{labelPrefix()}</span>
        </Show>
        <span class="text-[#ededed]">{labelAction()}</span>
      </div>
    </div>
  );
};
