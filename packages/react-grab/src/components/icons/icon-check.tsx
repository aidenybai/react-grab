import type { Component } from "solid-js";

interface IconCheckProps {
  size?: number;
  class?: string;
}

export const IconCheck: Component<IconCheckProps> = (props) => {
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
        d="M2 12C2 6.47 6.47 2 12 2C17.52 2 22 6.47 22 12C22 17.52 17.52 22 12 22C6.47 22 2 17.52 2 12ZM17.7 10.7C18.09 10.31 18.09 9.68 17.7 9.29C17.31 8.9 16.68 8.9 16.29 9.29L11 14.58L8.7 12.29C8.31 11.9 7.68 11.9 7.29 12.29C6.9 12.68 6.9 13.31 7.29 13.7L10.29 16.7C10.68 17.09 11.31 17.09 11.7 16.7L17.7 10.7Z"
      />
    </svg>
  );
};
