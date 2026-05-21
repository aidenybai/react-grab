import { Show } from "solid-js";
import type { Component, JSX } from "solid-js";
import type { TagBadgeProps } from "../../types.js";
import { cn } from "../../utils/cn.js";

export const TagBadge: Component<TagBadgeProps> = (props) => {
  const handleMouseEnter = () => {
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    props.onHoverChange?.(false);
  };

  const accessibleName = () =>
    props.componentName ? `${props.componentName}.${props.tagName}` : props.tagName;

  const tagLabel: JSX.Element = (
    <span class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
      <Show when={props.componentName}>
        <span class="text-[var(--rg-text-primary)]">{props.componentName}</span>
        <span class="text-[var(--rg-text-secondary)]">.{props.tagName}</span>
      </Show>
      <Show when={!props.componentName}>
        <span class="text-[var(--rg-text-primary)]">{props.tagName}</span>
      </Show>
    </span>
  );

  return (
    <Show
      when={props.isClickable}
      fallback={
        <div
          class={cn(
            "contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden",
            props.shrink && "shrink-0",
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {tagLabel}
        </div>
      }
    >
      <button
        type="button"
        aria-label={`Open source for ${accessibleName()}`}
        class={cn(
          "contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden cursor-pointer bg-transparent border-none p-0 m-0 text-left",
          props.shrink && "shrink-0",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={props.onClick}
      >
        {tagLabel}
      </button>
    </Show>
  );
};
