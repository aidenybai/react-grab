// Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (with or without the
// leading `#`). Shorthand forms are expanded to the long form so the
// rest of the pipeline can assume `#rrggbb[aa]` exclusively. Returns
// null when the input isn't a valid hex color.
const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const normalizeHex = (raw: string): string | null => {
  const match = raw.match(HEX_PATTERN);
  if (!match) return null;
  const digits = match[1];
  if (digits.length === 3) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`;
  }
  if (digits.length === 4) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}${digits[3]}${digits[3]}`;
  }
  return `#${digits}`;
};
