import type { Component } from "solid-js";

interface IconChevronProps {
  size?: number;
  class?: string;
}

export const IconChevron: Component<IconChevronProps> = (props) => {
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
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M9.29 16.71C8.9 16.32 8.9 15.68 9.29 15.29L12.59 12L9.29 8.71C8.9 8.32 8.9 7.68 9.29 7.29C9.68 6.9 10.32 6.9 10.71 7.29L14.71 11.29C14.89 11.48 15 11.73 15 12C15 12.27 14.89 12.52 14.71 12.71L10.71 16.71C10.32 17.1 9.68 17.1 9.29 16.71Z"
      />
    </svg>
  );
};
