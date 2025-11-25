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
        border: "1.5px solid rgb(210, 57, 192)",
        "border-top-color": "transparent", // not a thing TailwindCSS supports
        ...props.style,
      }}
      class="inline-block w-[8px] h-[8px] border-[1.5px] rounded-full mr-1 align-middle"
    />
  );
};
