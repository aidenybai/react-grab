import type { Component } from "solid-js";

interface IconStopProps {
  size?: number;
  class?: string;
}

export const IconStop: Component<IconStopProps> = (props) => {
  const size = () => props.size ?? 14;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
    >
      <rect x="5" y="5" width="14" height="14" rx="3.5" />
    </svg>
  );
};
