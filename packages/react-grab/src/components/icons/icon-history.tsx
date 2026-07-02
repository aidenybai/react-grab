import type { Component } from "solid-js";

interface IconHistoryProps {
  size?: number;
  class?: string;
}

export const IconHistory: Component<IconHistoryProps> = (props) => {
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
        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM11 7H13V11.586L16.207 14.793L14.793 16.207L11 12.414V7Z"
      />
    </svg>
  );
};
