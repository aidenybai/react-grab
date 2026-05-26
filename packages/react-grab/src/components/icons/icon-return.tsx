import type { Component } from "solid-js";

interface IconReturnProps {
  size?: number;
  class?: string;
}

export const IconReturn: Component<IconReturnProps> = (props) => {
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
        d="M10.7 21.2C10.31 21.59 9.68 21.59 9.29 21.2L3.29 15.2C2.9 14.81 2.9 14.18 3.29 13.79L9.29 7.79C9.68 7.4 10.31 7.4 10.7 7.79C11.09 8.18 11.09 8.81 10.7 9.2L6.41 13.5H16C16.55 13.5 17 13.05 17 12.5V3.5C17 2.94 17.44 2.5 18 2.5C18.55 2.5 19 2.94 19 3.5V12.5C19 14.15 17.65 15.5 16 15.5H6.41L10.7 19.79C11.09 20.18 11.09 20.81 10.7 21.2Z"
      />
    </svg>
  );
};
