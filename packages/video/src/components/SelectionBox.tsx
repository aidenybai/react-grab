import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { GRAB_PURPLE } from "../constants";

export interface SelectionBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Frame at which the selection box starts appearing */
  showAt: number;
  /** Frame at which the selection box starts disappearing (opacity → 0 over ~5 frames) */
  hideAt?: number;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  x,
  y,
  width,
  height,
  showAt,
  hideAt,
}) => {
  const frame = useCurrentFrame();

  // Appear: instant at showAt
  let opacity = frame >= showAt ? 1 : 0;

  // Disappear: fade out over 5 frames starting at hideAt
  if (hideAt !== undefined && frame >= hideAt) {
    opacity = interpolate(frame, [hideAt, hideAt + 5], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 40,
        pointerEvents: "none",
        left: x,
        top: y,
        width,
        height,
        borderRadius: 8,
        border: `2px solid ${GRAB_PURPLE}80`,
        backgroundColor: `${GRAB_PURPLE}14`,
        opacity,
      }}
    />
  );
};
