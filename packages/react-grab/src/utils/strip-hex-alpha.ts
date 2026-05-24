// Native <input type="color"> only accepts `#rrggbb` (no alpha, no
// shorthand). Strip the alpha byte if present so the picker opens at
// the right colour without rejecting the value.
export const stripHexAlpha = (hex: string): string => {
  if (hex.length === 9) return hex.slice(0, 7);
  return hex;
};
