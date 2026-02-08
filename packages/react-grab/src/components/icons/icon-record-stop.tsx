import type { Component } from "solid-js";

interface IconRecordStopProps {
  class?: string;
  size?: number;
}

export const IconRecordStop: Component<IconRecordStopProps> = (props) => (
  <svg
    class={props.class}
    width={props.size ?? 18}
    height={props.size ?? 18}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16ZM10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5Z"
      fill="#B91C1C"
    />
    <rect x="7" y="7" width="6" height="6" fill="#B91C1C" />
  </svg>
);
