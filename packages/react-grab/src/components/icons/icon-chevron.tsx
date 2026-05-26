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
        d="M9.29 16.7C8.9 16.31 8.9 15.68 9.29 15.29L12.58 12L9.29 8.7C8.9 8.31 8.9 7.68 9.29 7.29C9.68 6.9 10.31 6.9 10.7 7.29L14.7 11.29C14.89 11.48 15 11.73 15 12C15 12.26 14.89 12.51 14.7 12.7L10.7 16.7C10.31 17.09 9.68 17.09 9.29 16.7Z"
      />
    </svg>
  );
};
