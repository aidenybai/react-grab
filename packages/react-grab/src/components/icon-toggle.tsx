import type { Component } from "solid-js";

interface IconToggleProps {
  size?: number;
}

export const IconToggle: Component<IconToggleProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
};
