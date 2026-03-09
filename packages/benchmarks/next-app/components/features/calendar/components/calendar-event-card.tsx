"use client";

import { forwardRef } from "react";

interface CalendarEventCardProps {
  title: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
  color?: string;
  onClick?: () => void;
}

export const CalendarEventCard = forwardRef<
  HTMLDivElement,
  CalendarEventCardProps
>(function CalendarEventCard(
  { title, startTime, endTime, attendees, location, color, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      className="calendar-event-card"
      style={{ borderLeftColor: color ?? "#3b82f6" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <h3 className="calendar-event-card__title">{title}</h3>
      <p className="calendar-event-card__time">
        {startTime} — {endTime}
      </p>
      {location && <p className="calendar-event-card__location">{location}</p>}
      {attendees && attendees.length > 0 && (
        <div className="calendar-event-card__attendees">
          {attendees.slice(0, 3).map((a) => (
            <span key={a} className="calendar-event-card__avatar">
              {a[0]}
            </span>
          ))}
          {attendees.length > 3 && <span>+{attendees.length - 3}</span>}
        </div>
      )}
    </div>
  );
});
