import type { Component } from "solid-js";

interface IconTrashProps {
  size?: number;
  class?: string;
}

export const IconTrash: Component<IconTrashProps> = (props) => {
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
        d="M11 3C10.4477 3 10 3.44772 10 4V5H14V4C14 3.44772 13.5523 3 13 3H11ZM16 5V4C16 2.34315 14.6569 1 13 1H11C9.34315 1 8 2.34315 8 4V5H3C2.44772 5 2 5.44772 2 6C2 6.55228 2.44772 7 3 7H21C21.5523 7 22 6.55228 22 6C22 5.44772 21.5523 5 21 5H16ZM20 9H4V19C4 21.2091 5.79086 23 8 23H16C18.2091 23 20 21.2091 20 19V9ZM8 11C8.55228 11 9 11.4477 9 12V18.5C9 19.0523 8.55228 19.5 8 19.5C7.44772 19.5 7 19.0523 7 18.5V12C7 11.4477 7.44772 11 8 11ZM13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V12ZM17 12C17 11.4477 16.5523 11 16 11C15.4477 11 15 11.4477 15 12V18.5C15 19.0523 15.4477 19.5 16 19.5C16.5523 19.5 17 19.0523 17 18.5V12Z"
      />
    </svg>
  );
};
