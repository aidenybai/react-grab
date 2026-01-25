import { Show, createSignal } from "solid-js";
import type { Component } from "solid-js";
import type { TagBadgeProps } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { IconOpen } from "../icons/icon-open.jsx";

export const TagBadge: Component<TagBadgeProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    props.onHoverChange?.(false);
  };

  return (
    <div
      class={cn(
        "contain-layout font-mono flex items-center px-[3px] py-0 h-4 rounded-sm gap-0.5 [border-width:0.5px] border-solid border-black bg-black text-sm max-w-[280px]",
        props.shrink && "shrink-0",
        props.isClickable && "cursor-pointer press-scale",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={props.onClick}
    >
      <Show when={props.componentName}>
        <span class="text-white text-[13px] leading-3.5 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap">
          {props.componentName}
        </span>
        <span class="text-white/70 text-[13px] leading-3.5 h-fit font-medium shrink-0">
          .{props.tagName}
        </span>
      </Show>
      <Show when={!props.componentName}>
        <span class="text-white text-[13px] leading-3.5 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap">
          {props.tagName}
        </span>
      </Show>
      <Show when={props.isClickable || props.forceShowIcon}>
        <IconOpen
          size={10}
          class={cn(
            "text-white transition-all duration-100 shrink-0",
            isHovered() || props.forceShowIcon
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 -ml-[2px] w-0",
          )}
        />
      </Show>
    </div>
  );
};
