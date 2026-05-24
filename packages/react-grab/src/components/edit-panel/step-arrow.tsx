import type { Component } from "solid-js";

interface StepArrowProps {
  direction: "left" | "right";
  active: boolean;
  disabled?: boolean;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}

const CHEVRON_LEFT_PATH = "M14 6 L8 12 L14 18";
const CHEVRON_RIGHT_PATH = "M10 6 L16 12 L10 18";

const ACTIVE_COLOR = "var(--rg-text-primary)";
const IDLE_COLOR = "var(--rg-text-secondary)";
const ACTIVE_TRANSLATE_PX = 2;
const ACTIVE_SCALE = 1.12;

export const StepArrow: Component<StepArrowProps> = (props) => {
  const stroke = () => (props.disabled ? IDLE_COLOR : props.active ? ACTIVE_COLOR : IDLE_COLOR);
  const translateX = () =>
    props.active && !props.disabled
      ? props.direction === "left"
        ? -ACTIVE_TRANSLATE_PX
        : ACTIVE_TRANSLATE_PX
      : 0;
  const scale = () => (props.active && !props.disabled ? ACTIVE_SCALE : 1);
  const path = () => (props.direction === "left" ? CHEVRON_LEFT_PATH : CHEVRON_RIGHT_PATH);

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
        stroke={stroke()}
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
        style={{
          transition: props.disabled
            ? "stroke 200ms ease"
            : props.active
              ? "stroke 50ms ease"
              : "stroke 300ms ease",
        }}
      />
    </svg>
  );
};
