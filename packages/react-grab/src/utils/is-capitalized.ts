export const isCapitalized = (value: string): boolean =>
  value.length > 0 && /^[A-Z]/.test(value);
