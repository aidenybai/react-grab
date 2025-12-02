import type { Component } from "solid-js";

interface IconPointerProps {
  size?: number;
  class?: string;
}

export const IconPointer: Component<IconPointerProps> = (props) => {
  const width = () => props.size ?? 6;
  const height = () => (props.size ?? 6) * (21 / 12);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width()}
      height={height()}
      viewBox="0 0 12 21"
      fill="none"
      class={props.class}
    >
      <path
        d="M10.1405 18.636L6.40748 9.98307L5.63796 11.495L10.8646 11.8026C11.7083 11.8572 12.1109 10.9367 11.5117 10.334L1.61701 0.283414C1.06311 -0.280254 0.209618 0.0446264 0.193642 0.836866L0.00012689 14.8633C-0.0127441 15.7359 0.956587 16.0931 1.52647 15.4491L4.87551 11.7024L3.23753 11.1233L6.8254 20.0084C7.02067 20.5112 7.48979 20.6737 7.93227 20.4904L9.71488 19.7846C10.1795 19.6084 10.3522 19.1167 10.1405 18.636Z"
        fill="currentColor"
      />
    </svg>
  );
};
