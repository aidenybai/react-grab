import type { Component } from "solid-js";

interface IconChevronProps {
  size?: number;
  class?: string;
}

export const IconChevron: Component<IconChevronProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
};
