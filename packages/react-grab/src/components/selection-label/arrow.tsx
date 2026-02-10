import type { Component } from "solid-js";
import type { ArrowProps } from "../../types.js";
import { getArrowSize } from "../../utils/get-arrow-size.js";

export const Arrow: Component<ArrowProps> = (props) => {
  const arrowColor = () => props.color ?? "white";
  const isBottom = () => props.position === "bottom";
  const arrowSize = () => getArrowSize(props.labelWidth ?? 0);

  return (
    <div
      data-react-grab-arrow
      class="absolute w-0 h-0 z-10"
      style={{
        left: `calc(${props.leftPercent}% + ${props.leftOffsetPx}px)`,
        top: isBottom() ? "0" : undefined,
        bottom: isBottom() ? undefined : "0",
        transform: isBottom()
          ? "translateX(-50%) translateY(-100%)"
          : "translateX(-50%) translateY(100%)",
        "border-left": `${arrowSize()}px solid transparent`,
        "border-right": `${arrowSize()}px solid transparent`,
        "border-bottom": isBottom()
          ? `${arrowSize()}px solid ${arrowColor()}`
          : undefined,
        "border-top": isBottom()
          ? undefined
          : `${arrowSize()}px solid ${arrowColor()}`,
      }}
    />
  );
};
