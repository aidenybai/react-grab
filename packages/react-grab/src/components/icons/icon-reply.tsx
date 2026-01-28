import type { Component } from "solid-js";

interface IconReplyProps {
  size?: number;
  class?: string;
}

export const IconReply: Component<IconReplyProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 12 12"
      fill="none"
      class={props.class}
      style={{ transform: "rotate(180deg)" }}
    >
      <path
        d="M5 3V1L1 4.5L5 8V6C8 6 10 7 11 10C11 7 9 4 5 3Z"
        fill="currentColor"
      />
    </svg>
  );
};
