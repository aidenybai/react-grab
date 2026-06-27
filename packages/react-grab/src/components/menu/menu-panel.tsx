import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";

interface MenuPanelProps {
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}

export const MenuPanel: Component<MenuPanelProps> = (props) => (
  <div
    class={cn(
      "contain-layout flex flex-col rounded-[14px] antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)] bg-[var(--rg-panel-bg)]",
      props.class,
    )}
    style={props.style}
  >
    {props.children}
  </div>
);
