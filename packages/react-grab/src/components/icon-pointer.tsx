import type { Component } from "solid-js";

interface IconPointerProps {
  size?: number;
  class?: string;
}

export const IconPointer: Component<IconPointerProps> = (props) => {
  const size = () => props.size ?? 13;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 20 20"
      class={props.class}
    >
      <g fill="currentColor">
        <line
          x1="9"
          y1="3"
          x2="9"
          y2="4.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
        <line
          x1="13.2426"
          y1="4.7574"
          x2="12.182"
          y2="5.818"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
        <line
          x1="4.7574"
          y1="13.2426"
          x2="5.818"
          y2="12.182"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
        <line
          x1="3"
          y1="9"
          x2="4.5"
          y2="9"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
        <line
          x1="4.7574"
          y1="4.7574"
          x2="5.818"
          y2="5.818"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
        <line
          x1="17"
          y1="17"
          x2="13"
          y2="13"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
        <path
          d="m8.9487,8.3162l6.9062,2.3021c.4226.1409.4639.7223.0655.9216l-2.9203,1.4602-1.4602,2.9203c-.1992.3984-.7807.3571-.9216-.0655l-2.3021-6.9062c-.1303-.3909.2416-.7627.6325-.6325Z"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
