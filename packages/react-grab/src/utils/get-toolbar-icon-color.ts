import { MODE } from "../constants.js";

export const getToolbarIconColor = (
  isHighlighted: boolean,
  isDimmed: boolean,
): string => {
  const isDark = MODE === "dark";

  if (isHighlighted) {
    return isDark ? "text-white" : "text-black";
  }
  if (isDimmed) {
    return isDark ? "text-white/40" : "text-black/40";
  }
  return isDark ? "text-white/70" : "text-black/70";
};
