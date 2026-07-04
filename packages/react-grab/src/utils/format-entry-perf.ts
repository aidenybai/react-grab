import type { TimeMachineTimelineEntry } from "../types.js";

export const formatEntryPerf = (entry: TimeMachineTimelineEntry): string | null => {
  if (!entry.hasPerfIssue) return null;
  // The long animation frame subsumes the render work inside it, so the
  // frame duration is the more truthful single number when both exist.
  if (entry.loafDurationMs > 0) return `${Math.round(entry.loafDurationMs)}ms frame`;
  return `${Math.round(entry.renderDurationMs)}ms render`;
};
