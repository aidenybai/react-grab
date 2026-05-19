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

  // Triangle has a 90° apex (base = 2 * size, height = size), so the two edges
  // meet at right angles. For a tangent-arc corner radius `r` on a 90° vertex,
  // the tangent points sit `r` away from the apex along each edge, which is
  // `r / sqrt(2)` in both x and y when the edges are at 45° from vertical.
  const tipPath = () => {
    const totalWidth = arrowWidth();
    const totalHeight = arrowHeight();
    const tipRadius = ARROW_TIP_RADIUS_PX;
    const tangentOffset = tipRadius * Math.SQRT1_2;
    const halfWidth = totalWidth / 2;

    if (isBottom()) {
      return `M0 ${totalHeight} L${halfWidth - tangentOffset} ${tangentOffset} A${tipRadius} ${tipRadius} 0 0 1 ${halfWidth + tangentOffset} ${tangentOffset} L${totalWidth} ${totalHeight} Z`;
    }
    return `M0 0 L${halfWidth - tangentOffset} ${totalHeight - tangentOffset} A${tipRadius} ${tipRadius} 0 0 0 ${halfWidth + tangentOffset} ${totalHeight - tangentOffset} L${totalWidth} 0 Z`;
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
