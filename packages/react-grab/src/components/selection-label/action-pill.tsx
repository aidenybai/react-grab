import { Show } from "solid-js";
import type { Component } from "solid-js";
import type { ActionPillProps } from "../../types.js";
import { cn } from "../../utils/cn.js";

export const ActionPill: Component<ActionPillProps> = (props) => {
  return (
    <Show when={!props.isEditing}>
      <div
        class={cn(
          "contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-sm gap-[3px]",
          props.asButton && "cursor-pointer press-scale",
          props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
        )}
        role="button"
        onClick={props.onClick}
      >
        <div class="text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
          <Show
            when={props.isIdle}
            fallback={
              <>
                <span class="text-black/50">Click to </span>
                <span class="text-black">Copy</span>
              </>
            }
          >
            <span class="text-black/50">Right click for more</span>
          </Show>
        </div>
      </div>
    </Show>
  );
};
