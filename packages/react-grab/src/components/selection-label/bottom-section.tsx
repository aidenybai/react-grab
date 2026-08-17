import type { Component } from "solid-js";
import type { BottomSectionProps } from "../../types.js";
import { cn } from "../../utils/cn.js";

export const BottomSection: Component<BottomSectionProps> = (props) => (
  <div
    class={cn(
      "[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-[var(--rg-border-subtle)] antialiased",
      props.compact ? "py-1" : "py-1.5",
    )}
  >
    {props.children}
  </div>
);
