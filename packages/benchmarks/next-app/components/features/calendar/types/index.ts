export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  color?: string;
  location?: string;
  attendees?: CalendarAttendee[];
  recurrence?: CalendarRecurrence;
  status: "confirmed" | "tentative" | "cancelled";
  calendarId: string;
}

export interface CalendarAttendee {
  id: string;
  name: string;
  email: string;
  status: "accepted" | "declined" | "tentative" | "pending";
  avatarUrl?: string;
}

export interface Calendar {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  isDefault?: boolean;
  ownerId: string;
}

export interface CalendarRecurrence {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[];
}

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}
