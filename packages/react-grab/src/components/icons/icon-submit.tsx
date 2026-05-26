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
        d="M19.29 12.7C19.68 13.09 20.31 13.09 20.7 12.7C21.09 12.31 21.09 11.68 20.7 11.29L12.7 3.29C12.51 3.1 12.26 3 12 3C11.73 3 11.48 3.1 11.29 3.29L3.29 11.29C2.9 11.68 2.9 12.31 3.29 12.7C3.68 13.09 4.31 13.09 4.7 12.7L11 6.41L11 20C11 20.55 11.44 21 12 21C12.55 21 13 20.55 13 20L13 6.41L19.29 12.7Z"
      />
    </svg>
  );
};
