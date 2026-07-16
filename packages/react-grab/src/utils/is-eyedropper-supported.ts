export const isEyedropperSupported = (): boolean =>
  typeof window !== "undefined" && typeof window.EyeDropper === "function";
