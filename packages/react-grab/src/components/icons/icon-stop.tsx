import type { Component } from "solid-js";

interface IconStopProps {
  size?: number;
  class?: string;
}

export const IconStop: Component<IconStopProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 18 18"
      fill="none"
      class={props.class}
    >
      <path
        fill-rule="evenodd"
        d="M18 3C18 1 17 0 15 0H3C1 0 0 1 0 3V15C0 17 1 18 3 18H15C17 18 18 17 18 15V3ZM6 6H12V12H6V6Z"
        fill="currentColor"
      />
    </svg>
  );
};
