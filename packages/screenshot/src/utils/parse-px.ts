export const parsePx = (value: string | undefined): number => {
  if (value === undefined) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
