import type { Component } from "solid-js";

interface IconSubmitProps {
  size?: number;
  class?: string;
}

export const IconSubmit: Component<IconSubmitProps> = (props) => {
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
        d="M19.29 12.71C19.68 13.1 20.32 13.1 20.71 12.71C21.1 12.32 21.1 11.68 20.71 11.29L12.71 3.29C12.52 3.11 12.27 3 12 3C11.73 3 11.48 3.11 11.29 3.29L3.29 11.29C2.9 11.68 2.9 12.32 3.29 12.71C3.68 13.1 4.32 13.1 4.71 12.71L11 6.41L11 20C11 20.55 11.45 21 12 21C12.55 21 13 20.55 13 20L13 6.41L19.29 12.71Z"
      />
    </svg>
  );
};
