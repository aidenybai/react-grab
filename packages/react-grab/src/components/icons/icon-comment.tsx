import type { Component } from "solid-js";

interface IconCommentProps {
  size?: number;
  class?: string;
}

export const IconComment: Component<IconCommentProps> = (props) => {
  const size = () => props.size ?? 16;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
    >
      <path d="M12 2C6.48 2 2 5.92 2 10.5c0 2.47 1.33 4.67 3.4 6.13-.2.95-.72 2.37-2.1 3.67a.5.5 0 0 0 .33.86c2.37-.08 4.25-.87 5.52-1.77 1.02.27 2.08.41 3.15.41 5.52 0 10-3.92 10-8.8S17.52 2 12 2z" />
    </svg>
  );
};
