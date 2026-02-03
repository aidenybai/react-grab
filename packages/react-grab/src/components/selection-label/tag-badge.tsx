import { Show, createSignal } from "solid-js";
import type { Component } from "solid-js";
import type { TagBadgeProps } from "../../types.js";
import { TEXT_PRIMARY, TEXT_SECONDARY } from "../../constants.js";
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
        "contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden",
        props.shrink && "shrink-0",
        props.isClickable && "cursor-pointer",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={props.onClick}
    >
      <span
        class={cn(
          "text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0",
          TEXT_PRIMARY,
        )}
      >
        <Show when={props.componentName}>
          <span class={TEXT_PRIMARY}>{props.componentName}</span>
          <span class={TEXT_SECONDARY}>.{props.tagName}</span>
        </Show>
        <Show when={!props.componentName}>
          <span class={TEXT_PRIMARY}>{props.tagName}</span>
        </Show>
      </span>
      <Show when={props.isClickable || props.forceShowIcon}>
        <IconOpen
          size={10}
          class={cn(
            "transition-all duration-100 shrink-0",
            TEXT_PRIMARY,
            isHovered() || props.forceShowIcon
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 -ml-[2px] w-0",
          )}
        />
      </Show>
    </div>
  );
};
