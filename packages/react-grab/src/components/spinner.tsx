import type { JSX, Component } from "solid-js";

interface SpinnerProps {
  style?: JSX.CSSProperties;
}

export const Spinner: Component<SpinnerProps> = (props) => {
  return (
    <span
      class="inline-block w-2 h-2 border-[1.5px] border-grab-pink rounded-full mr-1 align-middle animate-spin"
      style={{
        "border-top-color": "transparent",
        ...props.style,
      }}
    />
  );
};
