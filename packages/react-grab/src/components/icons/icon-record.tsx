import type { Component } from "solid-js";

interface IconRecordProps {
  size?: number;
  class?: string;
}

export const IconRecord: Component<IconRecordProps> = (props) => {
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
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
};

export const IconStop: Component<IconRecordProps> = (props) => {
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
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
};
