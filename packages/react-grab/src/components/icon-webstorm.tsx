import type { Component } from "solid-js";

interface IconWebStormProps {
  size?: number;
}

export const IconWebStorm: Component<IconWebStormProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="currentColor"
      width={size()}
      height={size()}
    >
      <path d="M12 12h104v104H12z" />
      <path fill="#fff" d="M22.5 99h39v6.5h-39z" />
      <path fill="#fff" d="M24.5 28.2h10.6l5.9 21.9 6.7-21.9H55l6.7 22.1 5.9-22.1h10.3L66.8 71.8h-7.6l-7.1-23.3-7.1 23.3h-7.6L24.5 28.2z" />
    </svg>
  );
};
