import type { Component } from "solid-js";

interface StepArrowProps {
  direction: "left" | "right";
  active: boolean;
  disabled?: boolean;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}

// Filled chevron-arrow paths (matching arrow-left.svg / arrow-right.svg
// from the Solid icon set). Rounded joins via stroke-linejoin in the
// original SVG are baked into the path data here.
const ARROW_LEFT_PATH =
  "M16.7071 3.29289C17.0976 3.68342 17.0976 4.31658 16.7071 4.70711L9.41421 12L16.7071 19.2929C17.0976 19.6834 17.0976 20.3166 16.7071 20.7071C16.3166 21.0976 15.6834 21.0976 15.2929 20.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L15.2929 3.29289C15.6834 2.90237 16.3166 2.90237 16.7071 3.29289Z";
const ARROW_RIGHT_PATH =
  "M7.29289 20.7071C6.90237 20.3166 6.90237 19.6834 7.29289 19.2929L14.5858 12L7.29289 4.70711C6.90237 4.31658 6.90237 3.68342 7.29289 3.29289C7.68342 2.90237 8.31658 2.90237 8.70711 3.29289L16.7071 11.2929C16.8946 11.4804 17 11.7348 17 12C17 12.2652 16.8946 12.5196 16.7071 12.7071L8.70711 20.7071C8.31658 21.0976 7.68342 21.0976 7.29289 20.7071Z";

const ACTIVE_COLOR = "var(--rg-text-primary)";
const IDLE_COLOR = "var(--rg-text-secondary)";
const ACTIVE_TRANSLATE_PX = 2;
const ACTIVE_SCALE = 1.12;

export const StepArrow: Component<StepArrowProps> = (props) => {
  const fill = () => (props.disabled ? IDLE_COLOR : props.active ? ACTIVE_COLOR : IDLE_COLOR);
  const translateX = () =>
    props.active && !props.disabled
      ? props.direction === "left"
        ? -ACTIVE_TRANSLATE_PX
        : ACTIVE_TRANSLATE_PX
      : 0;
  const scale = () => (props.active && !props.disabled ? ACTIVE_SCALE : 1);
  const path = () => (props.direction === "left" ? ARROW_LEFT_PATH : ARROW_RIGHT_PATH);

  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      onPointerDown={props.disabled ? undefined : props.onPointerDown}
      onPointerUp={props.onPointerUp}
      onPointerLeave={props.onPointerLeave}
      style={{
        width: "14px",
        height: "14px",
        "flex-shrink": "0",
        cursor: props.disabled ? "default" : "pointer",
        transform: `translateX(${translateX()}px) scale(${scale()})`,
        transition: props.active
          ? "transform 30ms cubic-bezier(0, 0, 0.2, 1)"
          : "transform 450ms cubic-bezier(0.34, 1.8, 0.64, 1)",
      }}
    >
      <path
        d={path()}
        fill={fill()}
        fill-rule="evenodd"
        clip-rule="evenodd"
        style={{
          transition: props.disabled
            ? "fill 200ms ease"
            : props.active
              ? "fill 50ms ease"
              : "fill 300ms ease",
        }}
      />
    </svg>
  );
};
