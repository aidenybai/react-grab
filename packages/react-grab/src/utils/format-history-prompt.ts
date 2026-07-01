import type { HistoryMoment } from "../types.js";
import { formatRelativeTime } from "./format-relative-time.js";

// Describes a single point on a component's render timeline as an agent-ready
// note, e.g. "Counter re-rendered 12s ago — state 0: 4 → 5".
export const formatHistoryPrompt = (componentName: string, moment: HistoryMoment): string => {
  const changeLines = moment.changes.map(
    (change) => `  - ${change.label}: ${change.prev} → ${change.next}`,
  );
  return [
    `${componentName} re-rendered ${formatRelativeTime(moment.timestamp)}:`,
    ...changeLines,
  ].join("\n");
};
