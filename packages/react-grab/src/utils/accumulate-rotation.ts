// CSS interpolates `transform: rotate(deg)` linearly between numeric values,
// so going from 170° to -170° would visibly spin 340° instead of taking the
// 20° shortest path. Tracking rotation as an unbounded accumulator and
// snapping each new target to the equivalent within ±180° of the previous
// value keeps the transition snappy while letting the icon pirouette through
// full revolutions when the user circles the toolbar.
export const accumulateRotationDeg = (previousDeg: number, targetDeg: number): number => {
  const HALF_TURN_DEG = 180;
  const FULL_TURN_DEG = 360;
  let next = targetDeg;
  let delta = next - previousDeg;
  while (delta > HALF_TURN_DEG) {
    next -= FULL_TURN_DEG;
    delta = next - previousDeg;
  }
  while (delta < -HALF_TURN_DEG) {
    next += FULL_TURN_DEG;
    delta = next - previousDeg;
  }
  return next;
};
