import type { Component } from "solid-js";

interface IconPlayProps {
  class?: string;
}

export const IconPlay: Component<IconPlayProps> = (props) => (
  <svg
    class={props.class}
    width="6"
    height="7"
    viewBox="0 0 6 7"
    fill="white"
    stroke="white"
    stroke-width="1"
    stroke-linejoin="round"
  >
    <path d="M1 1L5 3.5L1 6V1Z" />
  </svg>
);
