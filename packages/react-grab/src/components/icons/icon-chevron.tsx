import type { Component } from "solid-js";

interface IconChevronProps {
  size?: number;
  class?: string;
}

export const IconChevron: Component<IconChevronProps> = (props) => {
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
      <path fill-rule="evenodd" clip-rule="evenodd" d="M9.29289 16.7071C8.90237 16.3166 8.90237 15.6834 9.29289 15.2929L12.5858 12L9.29289 8.70711C8.90237 8.31658 8.90237 7.68342 9.29289 7.29289C9.68342 6.90237 10.3166 6.90237 10.7071 7.29289L14.7071 11.2929C14.8946 11.4804 15 11.7348 15 12C15 12.2652 14.8946 12.5196 14.7071 12.7071L10.7071 16.7071C10.3166 17.0976 9.68342 17.0976 9.29289 16.7071Z" />
    </svg>
  );
};
