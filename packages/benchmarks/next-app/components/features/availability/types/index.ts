export interface Schedule {
  id: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  userId: string;
  days: DaySchedule[];
  overrides: DateOverride[];
}

export interface DaySchedule {
  day: DayOfWeek;
  enabled: boolean;
  ranges: TimeRange[];
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimeRange {
  start: string;
  end: string;
}

export interface DateOverride {
  date: string;
  ranges: TimeRange[];
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
}
