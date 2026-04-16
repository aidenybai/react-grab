import { REFERENCE_FRAME_DURATION_MS } from "../constants.js";

export const deltaLerp = (factor: number, deltaTimeMs: number): number => {
  const clampedDelta = Math.max(deltaTimeMs, 1);
  return 1 - (1 - factor) ** (clampedDelta / REFERENCE_FRAME_DURATION_MS);
};
