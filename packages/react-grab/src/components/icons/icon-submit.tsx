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
        d="M19.2929 12.7071C19.6834 13.0976 20.3166 13.0976 20.7071 12.7071C21.0976 12.3166 21.0976 11.6834 20.7071 11.2929L12.7071 3.29289C12.5196 3.10536 12.2652 3 12 3C11.7348 3 11.4804 3.10536 11.2929 3.29289L3.29289 11.2929C2.90237 11.6834 2.90237 12.3166 3.29289 12.7071C3.68342 13.0976 4.31658 13.0976 4.70711 12.7071L11 6.41421L11 20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20L13 6.41422L19.2929 12.7071Z"
      />
    </svg>
  );
};
