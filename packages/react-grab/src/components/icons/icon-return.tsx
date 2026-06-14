import type { Component } from "solid-js";

interface IconReturnProps {
  size?: number;
  class?: string;
}

export const IconReturn: Component<IconReturnProps> = (props) => {
  const size = () => props.size ?? 10;

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
        d="M10.71 21.21C10.32 21.6 9.68 21.6 9.29 21.21L3.29 15.21C2.9 14.82 2.9 14.18 3.29 13.79L9.29 7.79C9.68 7.4 10.32 7.4 10.71 7.79C11.1 8.18 11.1 8.82 10.71 9.21L6.41 13.5H16C16.55 13.5 17 13.05 17 12.5V3.5C17 2.95 17.45 2.5 18 2.5C18.55 2.5 19 2.95 19 3.5V12.5C19 14.16 17.66 15.5 16 15.5H6.41L10.71 19.79C11.1 20.18 11.1 20.82 10.71 21.21Z"
      />
    </svg>
  );
};
