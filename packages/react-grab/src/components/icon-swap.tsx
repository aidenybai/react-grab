import type { Component, JSX } from "solid-js";
import { cn } from "../utils/cn.js";

interface IconSwapProps {
  state: "a" | "b";
  iconA: JSX.Element;
  iconB: JSX.Element;
  class?: string;
}

export const IconSwap: Component<IconSwapProps> = (props) => {
  return (
    <span class={cn("rg-t-icon-swap", props.class)} data-state={props.state}>
      <span class="rg-t-icon" data-icon="a">
        {props.iconA}
      </span>
      <span class="rg-t-icon" data-icon="b">
        {props.iconB}
      </span>
    </span>
  );
};
