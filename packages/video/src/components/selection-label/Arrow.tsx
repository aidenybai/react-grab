import type React from "react";
import {
  ARROW_HEIGHT_PX,
  ARROW_MIN_SIZE_PX,
  ARROW_MAX_LABEL_WIDTH_RATIO,
} from "../../constants";

type ArrowPosition = "bottom" | "top";

interface ArrowProps {
  position: ArrowPosition;
  leftPercent: number;
  leftOffsetPx: number;
  color?: string;
  labelWidth?: number;
}

const getArrowSize = (labelWidth: number): number => {
  if (labelWidth <= 0) return ARROW_HEIGHT_PX;
  const scaledSize = labelWidth * ARROW_MAX_LABEL_WIDTH_RATIO;
  return Math.max(ARROW_MIN_SIZE_PX, Math.min(ARROW_HEIGHT_PX, scaledSize));
};

export const Arrow: React.FC<ArrowProps> = ({
  position,
  leftPercent,
  leftOffsetPx,
  color = "white",
  labelWidth = 0,
}) => {
  const isBottom = position === "bottom";
  const arrowSize = getArrowSize(labelWidth);

  return (
    <div
      className="absolute w-0 h-0 z-10"
      style={{
        left: `calc(${leftPercent}% + ${leftOffsetPx}px)`,
        top: isBottom ? "0" : undefined,
        bottom: isBottom ? undefined : "0",
        transform: isBottom
          ? "translateX(-50%) translateY(-100%)"
          : "translateX(-50%) translateY(100%)",
        borderLeft: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid transparent`,
        borderBottom: isBottom
          ? `${arrowSize}px solid ${color}`
          : undefined,
        borderTop: isBottom
          ? undefined
          : `${arrowSize}px solid ${color}`,
      }}
    />
  );
};
