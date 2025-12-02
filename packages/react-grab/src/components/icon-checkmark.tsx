import type { Component } from "solid-js";

interface IconCheckmarkProps {
  size?: number;
  class?: string;
}

export const IconCheckmark: Component<IconCheckmarkProps> = (props) => {
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
      <path
        d="M1 4.5L3.5 7L8 1.5"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
