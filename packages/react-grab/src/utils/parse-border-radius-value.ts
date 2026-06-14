export const parseBorderRadiusValue = (borderRadius: string): number => {
  if (!borderRadius) return 0;
  const match = borderRadius.match(/^(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : 0;
};
