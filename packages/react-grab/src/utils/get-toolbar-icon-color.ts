export const getToolbarIconColor = (
  isHighlighted: boolean,
  isDimmed: boolean,
): string => {
  if (isHighlighted) return "text-black";
  if (isDimmed) return "text-black/40";
  return "text-black/70";
};
