import { MIN_FRAME_DELTA_MS, BASELINE_FRAME_DURATION_MS } from "../constants.js";

export const adjustLerpForFrameDuration = (
  baselineLerpFactor: number,
  frameDurationMs: number,
): number => {
  const clampedFrameDurationMs = Math.max(frameDurationMs, MIN_FRAME_DELTA_MS);
  return 1 - (1 - baselineLerpFactor) ** (clampedFrameDurationMs / BASELINE_FRAME_DURATION_MS);
};
