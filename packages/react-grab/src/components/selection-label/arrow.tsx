import type { Component } from "solid-js";
import type { ArrowProps } from "../../types.js";
import { PANEL_BACKGROUND, ARROW_TIP_RADIUS_PX } from "../../constants.js";
import { getArrowSize } from "../../utils/get-arrow-size.js";

export const Arrow: Component<ArrowProps> = (props) => {
  const arrowColor = () => props.color ?? PANEL_BACKGROUND;
  const isBottom = () => props.position === "bottom";
  const arrowSize = () => getArrowSize(props.labelWidth ?? 0);
  const arrowWidth = () => arrowSize() * 2;
  const arrowHeight = () => arrowSize();

  const tipPath = () => {
    const totalWidth = arrowWidth();
    const totalHeight = arrowHeight();
    const tangentOffset = ARROW_TIP_RADIUS_PX * Math.SQRT1_2;
    const halfWidth = totalWidth / 2;
    const baseY = isBottom() ? totalHeight : 0;
    const tipY = isBottom() ? tangentOffset : totalHeight - tangentOffset;
    const sweepFlag = isBottom() ? 1 : 0;

    return `M0 ${baseY} L${halfWidth - tangentOffset} ${tipY} A${ARROW_TIP_RADIUS_PX} ${ARROW_TIP_RADIUS_PX} 0 0 ${sweepFlag} ${halfWidth + tangentOffset} ${tipY} L${totalWidth} ${baseY} Z`;
  };

  return (
    <svg
      data-react-grab-arrow
      class="absolute block z-10"
      width={arrowWidth()}
      height={arrowHeight()}
      viewBox={`0 0 ${arrowWidth()} ${arrowHeight()}`}
      style={{
        left: `calc(${props.leftPercent}% + ${props.leftOffsetPx}px)`,
        top: isBottom() ? "0" : undefined,
        bottom: isBottom() ? undefined : "0",
        transform: isBottom()
          ? "translateX(-50%) translateY(-100%)"
          : "translateX(-50%) translateY(100%)",
      }}
    >
      <path d={tipPath()} fill={arrowColor()} />
    </svg>
  );
};
