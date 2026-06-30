import type { ActivationMode, ActivationPolicy } from "../types.js";

export const resolveActivationPolicy = (mode: ActivationMode | undefined): ActivationPolicy => {
  const isMomentary = mode === "hold" || mode === "preview";
  return {
    keepsOverlayWhileHeld: isMomentary,
    persistsCompletedHold: !isMomentary,
    tapTogglesSession: mode === "preview",
    suppressActivationKeyDefault: mode === "preview",
  };
};
