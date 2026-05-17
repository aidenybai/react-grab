import type { Component } from "solid-js";

interface IconSelectProps {
  size?: number;
  class?: string;
}

export const IconSelect: Component<IconSelectProps> = (props) => {
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
        d="M20.8977 4.02356L21.8277 4.39121C22.3784 2.99813 21.0382 1.60206 19.6238 2.09546L3.47334 7.72936C1.38661 8.45728 1.49021 11.443 3.6224 12.0245L10.1289 13.799L11.2331 19.8724C11.638 22.0991 14.7072 22.4019 15.5393 20.2972L21.8277 4.39121L20.8977 4.02356Z"
      />
    </svg>
  );
};
