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
        d="M10.7071 21.2071C10.3166 21.5976 9.68342 21.5976 9.29289 21.2071L3.29289 15.2071C2.90237 14.8166 2.90237 14.1834 3.29289 13.7929L9.29289 7.79289C9.68342 7.40237 10.3166 7.40237 10.7071 7.79289C11.0976 8.18342 11.0976 8.81658 10.7071 9.20711L6.41421 13.5H16C16.5523 13.5 17 13.0523 17 12.5V3.5C17 2.94772 17.4477 2.5 18 2.5C18.5523 2.5 19 2.94772 19 3.5V12.5C19 14.1569 17.6569 15.5 16 15.5H6.41421L10.7071 19.7929C11.0976 20.1834 11.0976 20.8166 10.7071 21.2071Z"
      />
    </svg>
  );
};
