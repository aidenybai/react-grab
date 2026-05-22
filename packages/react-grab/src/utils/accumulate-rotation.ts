// CSS interpolates `transform: rotate(deg)` linearly between numeric values,
// so going from 170° to -170° would visibly spin 340° instead of taking the
// 20° shortest path. Tracking rotation as an unbounded accumulator and
// snapping each new target to the equivalent within ±180° of the previous
// value keeps the transition snappy while letting the icon pirouette through
// full revolutions when the user circles the toolbar.
//
// Closed-form (no loops) so V8 sees a single number→number arithmetic shape:
// fold the angular delta into [-180°, 180°] via Math.round of full-turn ratio.
const FULL_TURN_DEG = 360;

export const accumulateRotationDeg = (previousDeg: number, targetDeg: number): number => {
  const rawDelta = targetDeg - previousDeg;
  const wrappedTurns = Math.round(rawDelta / FULL_TURN_DEG);
  const shortestDelta = rawDelta - wrappedTurns * FULL_TURN_DEG;
  return previousDeg + shortestDelta;
};
