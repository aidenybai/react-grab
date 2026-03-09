export type BookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "no-show";

export interface Booking {
  id: string;
  title: string;
  description?: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: BookingLocation;
  attendees: BookingAttendee[];
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingLocation {
  type: "in-person" | "video" | "phone";
  address?: string;
  link?: string;
  phone?: string;
  provider?: "zoom" | "google-meet" | "teams" | "other";
}

export interface BookingAttendee {
  id: string;
  name: string;
  email: string;
  status: "accepted" | "declined" | "tentative" | "pending";
  optional: boolean;
}

export interface BookingSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface CreateBookingPayload {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: BookingLocation;
  attendeeEmails: string[];
}

export interface BookingFilter {
  status?: BookingStatus[];
  dateRange?: { start: string; end: string };
  organizerId?: string;
}
