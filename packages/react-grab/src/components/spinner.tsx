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
      class="inline-block w-2 h-2 border-[1.5px] border-grab-dark-pink border-t-transparent rounded-full mr-1 align-middle"
      style={props.style}
    />
  );
};
