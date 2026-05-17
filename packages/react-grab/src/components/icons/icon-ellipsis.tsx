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
        d="M7.5 12C7.5 13.3807 6.38071 14.5 5 14.5C3.61929 14.5 2.5 13.3807 2.5 12C2.5 10.6193 3.61929 9.5 5 9.5C6.38071 9.5 7.5 10.6193 7.5 12ZM14.5 12C14.5 13.3807 13.3807 14.5 12 14.5C10.6193 14.5 9.5 13.3807 9.5 12C9.5 10.6193 10.6193 9.5 12 9.5C13.3807 9.5 14.5 10.6193 14.5 12ZM19 14.5C20.3807 14.5 21.5 13.3807 21.5 12C21.5 10.6193 20.3807 9.5 19 9.5C17.6193 9.5 16.5 10.6193 16.5 12C16.5 13.3807 17.6193 14.5 19 14.5Z"
      />
    </svg>
  );
};
