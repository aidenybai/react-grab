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
          d="M20.89 4.02L21.82 4.39C22.37 2.99 21.03 1.6 19.62 2.09L3.47 7.72C1.38 8.45 1.49 11.44 3.62 12.02L10.12 13.79L11.23 19.87C11.63 22.09 14.7 22.4 15.53 20.29L21.82 4.39L20.89 4.02Z"
        />
      </svg>
    </span>
  );
};
