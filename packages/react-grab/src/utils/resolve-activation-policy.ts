import type { ActivationMode, ActivationPolicy } from "../types.js";

export const resolveActivationPolicy = (
  mode: ActivationMode | undefined,
  hasCustomActivationKey: boolean,
): ActivationPolicy => {
  const isMomentary = mode === "hold" || mode === "preview";
  return {
    keepsOverlayWhileHeld: isMomentary,
    persistsCompletedHold: !isMomentary,
    tapTogglesSession: mode === "preview",
    // Gated on a custom key so preview mode left on the default Cmd/Ctrl+C does
    // not swallow the native copy event that drives copy-to-activate.
    suppressActivationKeyDefault: mode === "preview" && hasCustomActivationKey,
  };
};
