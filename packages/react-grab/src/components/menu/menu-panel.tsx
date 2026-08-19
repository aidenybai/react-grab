import type { Component } from "solid-js";
import type { JSX } from "@solidjs/web";
import { cn } from "../../utils/cn.js";
import { Surface } from "../ui/surface.js";

interface MenuPanelProps {
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}

export const MenuPanel: Component<MenuPanelProps> = (props) => (
  <Surface class={cn("flex flex-col w-fit h-fit", props.class)} style={props.style}>
    {props.children}
  </Surface>
);
