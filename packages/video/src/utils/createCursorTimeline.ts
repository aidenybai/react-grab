import { Easing, interpolate } from "remotion";

export interface CursorWaypoint {
  frame: number;
  x: number;
  y: number;
}

/**
 * Creates a cursor timeline from an array of waypoints.
 * Returns interpolated x/y for any given frame using cubic easing.
 */
export const createCursorTimeline = (
  waypoints: CursorWaypoint[],
): ((frame: number) => { x: number; y: number }) => {
  if (waypoints.length === 0) {
    return () => ({ x: 0, y: 0 });
  }

  if (waypoints.length === 1) {
    return () => ({ x: waypoints[0].x, y: waypoints[0].y });
  }

  const frames = waypoints.map((w) => w.frame);
  const xValues = waypoints.map((w) => w.x);
  const yValues = waypoints.map((w) => w.y);

  return (frame: number) => {
    const x = interpolate(frame, frames, xValues, {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const y = interpolate(frame, frames, yValues, {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { x, y };
  };
};
