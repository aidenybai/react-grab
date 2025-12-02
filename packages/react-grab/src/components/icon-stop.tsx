import type { Component } from "solid-js";

interface IconStopProps {
  size?: number;
  class?: string;
}

export const IconStop: Component<IconStopProps> = (props) => {
  const size = () => props.size ?? 9;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 9 9"
      fill="none"
      class={props.class}
    >
      <rect
        x="1"
        y="1"
        width="7"
        height="7"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
};


