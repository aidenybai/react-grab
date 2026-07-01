// Compact "time ago" label for the render-history timeline (e.g. "12s ago").
export const formatRelativeTime = (timestamp: number): string => {
  const secondsAgo = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (secondsAgo < 1) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutesAgo = Math.round(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.round(minutesAgo / 60);
  return `${hoursAgo}h ago`;
};
