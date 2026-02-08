export const getToolbarIconColor = (
  isHighlighted: boolean,
  isDimmed: boolean,
): string => {
  if (isHighlighted) return "text-white";
  if (isDimmed) return "text-white/40";
  return "text-white/70";
};
