import type { Component } from "solid-js";

interface IconCommentProps {
  size?: number;
  class?: string;
}

export const IconComment: Component<IconCommentProps> = (props) => {
  const size = () => props.size ?? 14;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 12 12"
      fill="currentColor"
      class={props.class}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M1 6C1 3.239 3.239 1 6 1C8.761 1 11 3.239 11 6C11 8.761 8.761 11 6 11C5.103 11 4.261 10.764 3.532 10.35C2.959 10.759 2.257 11 1.5 11C1.376 11 1.253 10.993 1.132 10.981C0.923 10.959 0.75 10.809 0.699 10.605C0.648 10.402 0.729 10.188 0.903 10.07C1.347 9.768 1.688 9.328 1.865 8.812C1.319 8.011 1 7.042 1 6Z"
      />
    </svg>
  );
};
