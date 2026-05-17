import type { Component } from "solid-js";

interface IconCopyProps {
  size?: number;
  class?: string;
}

export const IconCopy: Component<IconCopyProps> = (props) => {
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
        d="M10.0812 2C8.70649 2 7.48605 2.87964 7.05134 4.18377C6.8767 4.70772 7.15986 5.27404 7.6838 5.44868C8.20774 5.62333 8.77406 5.34017 8.94871 4.81623C9.11119 4.32878 9.56736 4 10.0812 4H19C19.5523 4 20 4.44772 20 5V13.9189C20 14.4327 19.6712 14.8888 19.1838 15.0513C18.6599 15.226 18.3767 15.7923 18.5513 16.3162C18.726 16.8402 19.2923 17.1233 19.8163 16.9487C21.1204 16.514 22 15.2935 22 13.9189V5C22 3.34315 20.6569 2 19 2H10.0812ZM2 10C2 8.34315 3.34315 7 5 7H14C15.6569 7 17 8.34315 17 10V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10Z"
      />
    </svg>
  );
};
