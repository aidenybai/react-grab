import type { Component } from "solid-js";

interface IconCommandProps {
  size?: number;
  class?: string;
}

export const IconCommand: Component<IconCommandProps> = (props) => {
  const size = () => props.size ?? 11;

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
        d="M6.5 5C5.67 5 5 5.67 5 6.5C5 7.33 5.67 8 6.5 8H8V6.5C8 5.67 7.33 5 6.5 5ZM10 8V6.5C10 4.567 8.433 3 6.5 3C4.567 3 3 4.567 3 6.5C3 8.433 4.567 10 6.5 10H8V14H6.5C4.567 14 3 15.567 3 17.5C3 19.433 4.567 21 6.5 21C8.433 21 10 19.433 10 17.5V16H14V17.5C14 19.433 15.567 21 17.5 21C19.433 21 21 19.433 21 17.5C21 15.567 19.433 14 17.5 14H16V10H17.5C19.433 10 21 8.433 21 6.5C21 4.567 19.433 3 17.5 3C15.567 3 14 4.567 14 6.5V8H10ZM10 10V14H14V10H10ZM16 8H17.5C18.33 8 19 7.33 19 6.5C19 5.67 18.33 5 17.5 5C16.67 5 16 5.67 16 6.5V8ZM16 16V17.5C16 18.33 16.67 19 17.5 19C18.33 19 19 18.33 19 17.5C19 16.67 18.33 16 17.5 16H16ZM8 16H6.5C5.67 16 5 16.67 5 17.5C5 18.33 5.67 19 6.5 19C7.33 19 8 18.33 8 17.5V16Z"
      />
    </svg>
  );
};
