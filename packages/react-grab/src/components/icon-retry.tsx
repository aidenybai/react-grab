import type { Component } from "solid-js";

interface IconRetryProps {
  size?: number;
  class?: string;
}

export const IconRetry: Component<IconRetryProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      class={props.class}
    >
      <path
        d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
        fill="currentColor"
      />
    </svg>
  );
};
