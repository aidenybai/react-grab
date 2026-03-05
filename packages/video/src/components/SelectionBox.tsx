import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { GRAB_PINK } from "../constants";

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

  // Appear: quick fade in over 4 frames via interpolate()
  const appearOpacity = interpolate(
    frame,
    [showAt, showAt + 4],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Disappear: fade out over 5 frames starting at hideAt
  const disappearOpacity =
    hideAt !== undefined
      ? interpolate(frame, [hideAt, hideAt + 5], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const opacity = Math.min(appearOpacity, disappearOpacity);

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
        border: `2px solid ${GRAB_PINK}cc`,
        backgroundColor: `${GRAB_PINK}1a`,
        opacity,
      }}
    />
  );
};
