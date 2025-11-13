import { onMount } from "solid-js";
import type { JSX, Component } from "solid-js";

interface SpinnerProps {
  style?: JSX.CSSProperties;
}

export const Spinner: Component<SpinnerProps> = (props) => {
  let spinnerRef: HTMLSpanElement | undefined;

  onMount(() => {
    if (spinnerRef) {
      spinnerRef.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        {
          duration: 600,
          easing: "linear",
          iterations: Infinity,
        },
      );
    }
  });

  return (
    <span
      ref={spinnerRef}
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        border: "1.5px solid rgb(210, 57, 192)",
        "border-top-color": "transparent",
        "border-radius": "50%",
        "margin-right": "4px",
        "vertical-align": "middle",
        ...props.style,
      }}
    />
  );
};

