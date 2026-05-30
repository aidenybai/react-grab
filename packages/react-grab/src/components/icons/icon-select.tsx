import type { Component } from "solid-js";
import { cn } from "../../utils/cn.js";
import { SELECT_ICON_ROTATION_TRANSITION_MS } from "../../constants.js";

interface IconSelectProps {
  size?: number;
  class?: string;
  rotationDeg?: number;
}

export const IconSelect: Component<IconSelectProps> = (props) => {
  const size = () => props.size ?? 14;
  const rotationDeg = () => props.rotationDeg ?? 0;

  return (
    <span
      class={cn("inline-flex items-center justify-center will-change-transform", props.class)}
      style={{
        transform: `rotate(${rotationDeg()}deg)`,
        "transition-property": "transform",
        "transition-duration": `${SELECT_ICON_ROTATION_TRANSITION_MS}ms`,
        "transition-timing-function": "cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size()}
        height={size()}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M20.9 4.02L21.83 4.39C22.38 3 21.04 1.6 19.62 2.1L3.47 7.73C1.39 8.46 1.49 11.443 3.62 12.02L10.13 13.799L11.23 19.87C11.638 22.1 14.71 22.4 15.54 20.3L21.83 4.39L20.9 4.02Z"
        />
      </svg>
    </span>
  );
};
