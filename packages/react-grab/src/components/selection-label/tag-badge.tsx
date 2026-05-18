import { Show } from "solid-js";
import type { Component } from "solid-js";
import type { TagBadgeProps } from "../../types.js";
import { cn } from "../../utils/cn.js";

export const TagBadge: Component<TagBadgeProps> = (props) => {
  const handleMouseEnter = () => {
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
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
      <span class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
        <Show when={props.componentName}>
          <span class="text-[var(--rg-text-primary)]">{props.componentName}</span>
          <span class="text-[var(--rg-text-secondary)]">.{props.tagName}</span>
        </Show>
        <Show when={!props.componentName}>
          <span class="text-[var(--rg-text-primary)]">{props.tagName}</span>
        </Show>
      </span>
    </div>
  );
};
