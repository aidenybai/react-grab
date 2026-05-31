export const parseWaitMs = (raw: string | undefined): number | null => {
  if (raw === undefined) return 0;
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  if (/^(inf|infinite|infinity|forever)$/i.test(trimmed)) return Number.POSITIVE_INFINITY;
  const ms = Number(trimmed);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
};

export const parseGrabCount = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  // Number("") and Number("  ") are 0, which would mask empty/garbage input.
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 0 ? value : null;
};
