export const parseBorderRadiusValue = (borderRadius: string): number => {
  if (!borderRadius) return 0;
  const match = borderRadius.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};
