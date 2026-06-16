import type { Component } from "solid-js";
import { DRAW_PENCIL_PATH_D } from "../../constants.js";

interface IconDrawProps {
  size?: number;
  class?: string;
}

export const IconDraw: Component<IconDrawProps> = (props) => {
  const size = () => props.size ?? 14;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      class={props.class}
    >
      <path fill-rule="evenodd" clip-rule="evenodd" d={DRAW_PENCIL_PATH_D} fill="currentColor" />
    </svg>
  );
};
