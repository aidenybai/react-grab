import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { GRAB_PURPLE } from "../constants";

export interface SuccessFlashProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Frame at which the flash starts */
  triggerAt: number;
  /** Duration of the flash in frames (default: 12) */
  duration?: number;
}

export const SuccessFlash: React.FC<SuccessFlashProps> = ({
  x,
  y,
  width,
  height,
  triggerAt,
  duration = 12,
}) => {
  const frame = useCurrentFrame();

  if (frame < triggerAt || frame > triggerAt + duration) return null;

  // Pulse: opacity goes 0 → 1 → 0 over the duration
  const opacity = interpolate(
    frame,
    [triggerAt, triggerAt + duration * 0.3, triggerAt + duration],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 42,
        pointerEvents: "none",
        left: x,
        top: y,
        width,
        height,
        borderRadius: 8,
        border: `2px solid ${GRAB_PURPLE}`,
        backgroundColor: `${GRAB_PURPLE}26`,
        opacity,
      }}
    />
  );
};
