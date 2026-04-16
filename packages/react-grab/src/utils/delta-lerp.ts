import { MIN_DELTA_TIME_MS, REFERENCE_FRAME_DURATION_MS } from "../constants.js";

export const deltaLerp = (perFrameFactor: number, elapsedMs: number): number => {
  const safeElapsedMs = Math.max(elapsedMs, MIN_DELTA_TIME_MS);
  return 1 - (1 - perFrameFactor) ** (safeElapsedMs / REFERENCE_FRAME_DURATION_MS);
};
