export const getToolbarIconColor = (
  isHighlighted: boolean,
  isActive: boolean,
): string => {
  if (isHighlighted) return "text-black";
  if (isActive) return "text-black/40";
  return "text-black/70";
};
