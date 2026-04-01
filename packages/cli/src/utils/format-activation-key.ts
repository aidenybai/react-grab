import type { ReactGrabOptions } from "./transform.js";

export const formatActivationKeyDisplay = (
  activationKey: ReactGrabOptions["activationKey"],
): string => {
  const defaultLabel = process.platform === "darwin" ? "Option" : "Alt";
  if (!activationKey) return `Default (${defaultLabel})`;
  return activationKey
    .split("+")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "meta") return process.platform === "darwin" ? "⌘" : "Win";
      if (lower === "alt") return process.platform === "darwin" ? "⌥" : "Alt";
      if (lower === "ctrl") return "Ctrl";
      if (lower === "shift") return "Shift";
      if (lower === "space" || lower === " ") return "Space";
      return part.toUpperCase();
    })
    .join(" + ");
};
