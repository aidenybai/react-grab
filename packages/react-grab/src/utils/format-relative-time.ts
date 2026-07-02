const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const JUST_NOW_THRESHOLD_MS = 10 * SECOND_MS;

export const formatRelativeTime = (timestamp: number): string => {
  const elapsedMs = Math.max(0, Date.now() - timestamp);
  if (elapsedMs < JUST_NOW_THRESHOLD_MS) return "just now";
  if (elapsedMs < MINUTE_MS) return `${Math.floor(elapsedMs / SECOND_MS)}s ago`;
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)}m ago`;
  return `${Math.floor(elapsedMs / HOUR_MS)}h ago`;
};
