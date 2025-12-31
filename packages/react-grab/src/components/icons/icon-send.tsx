import type { Component } from "solid-js";

interface IconSendProps {
  size?: number;
  class?: string;
}

export const IconSend: Component<IconSendProps> = (props) => {
  const size = () => props.size ?? 16;

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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
};
