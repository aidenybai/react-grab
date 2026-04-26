const NUMERIC_PATTERN = /^\d+(?:\.\d+)?$/;

export const parseTimeoutSeconds = (raw: string): number => {
  const trimmed = raw.trim();
  if (!NUMERIC_PATTERN.test(trimmed)) {
    throw new Error(`Invalid --timeout value: "${raw}". Pass a non-negative number of seconds.`);
  }
  const seconds = Number.parseFloat(trimmed);
  if (!Number.isFinite(seconds)) {
    throw new Error(`Invalid --timeout value: "${raw}". Pass a non-negative number of seconds.`);
  }
  return seconds;
};
