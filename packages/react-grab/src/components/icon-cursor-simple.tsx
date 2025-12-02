import type { Component } from "solid-js";

interface IconCursorSimpleProps {
  size?: number;
  class?: string;
}

export const IconCursorSimple: Component<IconCursorSimpleProps> = (props) => {
  const size = () => props.size ?? 9;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 12 12"
      fill="none"
      class={props.class}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M0.675576 0.0318497C0.491988 -0.0369956 0.285105 0.0078173 0.146461 0.146461C0.0078173 0.285105 -0.0369956 0.491988 0.0318497 0.675576L4.15685 11.6756C4.2337 11.8805 4.43492 12.0117 4.65345 11.9992C4.87197 11.9868 5.057 11.8336 5.11009 11.6213L6.41232 6.41232L11.6213 5.11009C11.8336 5.057 11.9868 4.87197 11.9992 4.65345C12.0117 4.43492 11.8805 4.2337 11.6756 4.15685L0.675576 0.0318497Z"
        fill="currentColor"
      />
    </svg>
  );
};

