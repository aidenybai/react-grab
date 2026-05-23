const MAX_DISPLAY_DECIMALS = 2;
const ROUND_FACTOR = 100;

export const formatDisplayValue = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(MAX_DISPLAY_DECIMALS).replace(/\.?0+$/, "");
};

export const cleanNumericValue = (value: number): number =>
  Number.isInteger(value) ? value : Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
