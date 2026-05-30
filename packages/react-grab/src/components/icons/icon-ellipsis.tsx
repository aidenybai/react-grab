import type { Component } from "solid-js";

interface IconEllipsisProps {
  size?: number;
  class?: string;
}

export const IconEllipsis: Component<IconEllipsisProps> = (props) => {
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
        d="M7.5 12C7.5 13.38 6.38 14.5 5 14.5C3.62 14.5 2.5 13.38 2.5 12C2.5 10.62 3.62 9.5 5 9.5C6.38 9.5 7.5 10.62 7.5 12ZM14.5 12C14.5 13.38 13.38 14.5 12 14.5C10.62 14.5 9.5 13.38 9.5 12C9.5 10.62 10.62 9.5 12 9.5C13.38 9.5 14.5 10.62 14.5 12ZM19 14.5C20.38 14.5 21.5 13.38 21.5 12C21.5 10.62 20.38 9.5 19 9.5C17.62 9.5 16.5 10.62 16.5 12C16.5 13.38 17.62 14.5 19 14.5Z"
      />
    </svg>
  );
};
