import type { Component } from "solid-js";
import type { ArrowProps } from "../../types.js";

export const Arrow: Component<ArrowProps> = (props) => {
  const arrowColor = () => props.color ?? "white";
  const isBottom = () => props.position === "bottom";

  return (
    <div
      class="absolute w-0 h-0 z-10"
      style={{
        left: `calc(${props.leftPercent}% + ${props.leftOffsetPx}px)`,
        top: isBottom() ? "0" : undefined,
        bottom: isBottom() ? undefined : "0",
        transform: isBottom()
          ? "translateX(-50%) translateY(-100%)"
          : "translateX(-50%) translateY(100%)",
        "border-left": "8px solid transparent",
        "border-right": "8px solid transparent",
        "border-bottom": isBottom() ? `8px solid ${arrowColor()}` : undefined,
        "border-top": isBottom() ? undefined : `8px solid ${arrowColor()}`,
        filter: isBottom()
          ? "drop-shadow(-1px -1px 0 rgba(0,0,0,0.06)) drop-shadow(1px -1px 0 rgba(0,0,0,0.06))"
          : "drop-shadow(-1px 1px 0 rgba(0,0,0,0.06)) drop-shadow(1px 1px 0 rgba(0,0,0,0.06))",
      }}
    />
  );
};
