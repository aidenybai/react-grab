import type { Component } from "solid-js";

interface IconMenuProps {
  size?: number;
  class?: string;
}

export const IconMenu: Component<IconMenuProps> = (props) => {
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
      <path fill-rule="evenodd" clip-rule="evenodd" d="M20 6L4 6L4 4L20 4L20 6Z" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="M20 13L4 13L4 11L20 11L20 13Z" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="M20 20L4 20L4 18L20 18L20 20Z" />
    </svg>
  );
};
