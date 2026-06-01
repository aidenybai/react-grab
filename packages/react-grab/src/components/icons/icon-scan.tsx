import type { Component } from "solid-js";

interface IconScanProps {
  size?: number;
  class?: string;
}

export const IconScan: Component<IconScanProps> = (props) => {
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
        d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0ZM12 7.5a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1ZM13.05 15.5a1.05 1.05 0 1 0-2.1 0 1.05 1.05 0 0 0 2.1 0Z"
      />
    </svg>
  );
};
