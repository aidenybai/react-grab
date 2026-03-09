interface TimeRange {
  start: string;
  end: string;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function doRangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return (
    timeToMinutes(a.start) < timeToMinutes(b.end) &&
    timeToMinutes(b.start) < timeToMinutes(a.end)
  );
}

export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
  );
  const merged: TimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (timeToMinutes(sorted[i].start) <= timeToMinutes(last.end)) {
      last.end =
        timeToMinutes(sorted[i].end) > timeToMinutes(last.end)
          ? sorted[i].end
          : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

export function isValidRange(range: TimeRange): boolean {
  return timeToMinutes(range.start) < timeToMinutes(range.end);
}

export function generateTimeOptions(intervalMinutes: number = 15): string[] {
  const options: string[] = [];
  for (let m = 0; m < 24 * 60; m += intervalMinutes) {
    options.push(minutesToTime(m));
  }
  return options;
}
