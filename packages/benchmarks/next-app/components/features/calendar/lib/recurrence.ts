export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[];
}

export function generateOccurrences(
  startDate: Date,
  rule: RecurrenceRule,
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  const maxOccurrences = rule.count ?? 365;

  for (let i = 0; i < maxOccurrences; i++) {
    if (rule.until && current > rule.until) break;
    occurrences.push(new Date(current));
    switch (rule.frequency) {
      case "daily":
        current.setDate(current.getDate() + rule.interval);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7 * rule.interval);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + rule.interval);
        break;
      case "yearly":
        current.setFullYear(current.getFullYear() + rule.interval);
        break;
    }
  }

  return occurrences;
}

export function describeRecurrence(rule: RecurrenceRule): string {
  const freq = rule.frequency;
  if (rule.interval === 1) return `Every ${freq.replace("ly", "")}`;
  return `Every ${rule.interval} ${freq.replace("ly", "")}s`;
}
