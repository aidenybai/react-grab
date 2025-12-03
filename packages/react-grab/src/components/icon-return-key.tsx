import type { Component } from "solid-js";

interface IconReturnKeyProps {
  size?: number;
  class?: string;
}

export const IconReturnKey: Component<IconReturnKeyProps> = (props) => {
  const size = () => props.size ?? 14;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 12 12"
      class={props.class}
    >
      <g
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1"
        stroke="currentColor"
      >
        <path d="m1.25,6.75h8.5c.5523,0,1-.4477,1-1v-2.5c0-.5523-.4477-1-1-1h-1.75" />
        <polyline points="3.75 4 1 6.75 3.75 9.5" />
      </g>
    </svg>
  );
};
