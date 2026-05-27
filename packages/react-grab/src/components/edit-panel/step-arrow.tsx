import type { Component } from "solid-js";

interface StepArrowProps {
  direction: "left" | "right";
  active: boolean;
  disabled?: boolean;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}

const ARROW_BLOCK_LEFT_PATH =
  "M2.54282 10.5427C1.76177 11.3238 1.76177 12.5901 2.54282 13.3712L9.70183 20.5302C11.1193 21.9476 13.5428 20.9437 13.5428 18.9392V16.9573H21.0428C22.1474 16.9573 23.0428 16.0619 23.0428 14.9573V8.95733C23.0428 7.85276 22.1474 6.95733 21.0428 6.95733L13.5428 6.95733V4.97473C13.5428 2.9702 11.1193 1.96631 9.70183 3.38373L2.54282 10.5427Z";
const ARROW_BLOCK_RIGHT_PATH =
  "M14.2983 20.5302L21.4573 13.3712C22.2383 12.5901 22.2383 11.3238 21.4573 10.5427L14.2983 3.38374C12.8808 1.96631 10.4573 2.97019 10.4573 4.97473V6.95659L3.95728 6.95659C2.85271 6.95659 1.95728 7.85202 1.95728 8.95659V14.9566C1.95728 16.0612 2.85271 16.9566 3.95727 16.9566H10.4573V18.9392C10.4573 20.9437 12.8808 21.9476 14.2983 20.5302Z";

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
  const path = () => (props.direction === "left" ? ARROW_BLOCK_LEFT_PATH : ARROW_BLOCK_RIGHT_PATH);

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
        width: "16px",
        height: "16px",
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
