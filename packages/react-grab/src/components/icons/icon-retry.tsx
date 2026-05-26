import type { Component } from "solid-js";

interface IconRetryProps {
  size?: number;
  class?: string;
}

export const IconRetry: Component<IconRetryProps> = (props) => {
  const size = () => props.size ?? 12;

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
        d="M7 2C4.23 2 2 4.23 2 7V15C2 17.76 4.23 20 7 20H8C8.55 20 9 19.55 9 19C9 18.44 8.55 18 8 18H7C5.34 18 4 16.65 4 15V7C4 5.34 5.34 4 7 4H17C18.65 4 20 5.34 20 7V15C20 16.65 18.65 18 17 18H14.41L16.2 16.2C16.59 15.81 16.59 15.18 16.2 14.79C15.81 14.4 15.18 14.4 14.79 14.79L11.29 18.29C11.19 18.38 11.12 18.49 11.07 18.61C11.02 18.73 11 18.86 11 19C11 19.27 11.1 19.52 11.28 19.7C11.28 19.7 11.29 19.7 11.29 19.7L14.79 23.2C15.18 23.59 15.81 23.59 16.2 23.2C16.59 22.81 16.59 22.18 16.2 21.79L14.41 20H17C19.76 20 22 17.76 22 15V7C22 4.23 19.76 2 17 2H7Z"
      />
    </svg>
  );
};
