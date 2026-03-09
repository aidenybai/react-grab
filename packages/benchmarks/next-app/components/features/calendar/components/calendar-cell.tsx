"use client";

import { memo } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  color?: string;
}

interface CalendarCellProps {
  date: Date;
  events: CalendarEvent[];
  isToday?: boolean;
  isSelected?: boolean;
  isOutsideMonth?: boolean;
  onClick?: (date: Date) => void;
}

export const CalendarCell = memo(function CalendarCell({
  date,
  events,
  isToday = false,
  isSelected = false,
  isOutsideMonth = false,
  onClick,
}: CalendarCellProps) {
  const cellClasses = [
    "calendar-cell",
    isToday && "calendar-cell--today",
    isSelected && "calendar-cell--selected",
    isOutsideMonth && "calendar-cell--outside",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cellClasses}
      onClick={() => onClick?.(date)}
      role="gridcell"
    >
      <span className="calendar-cell__date">{date.getDate()}</span>
      <div className="calendar-cell__events">
        {events.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="calendar-cell__event"
            style={{ borderLeftColor: event.color ?? "#3b82f6" }}
          >
            <span className="calendar-cell__event-time">{event.startTime}</span>
            <span className="calendar-cell__event-title">{event.title}</span>
          </div>
        ))}
        {events.length > 3 && (
          <span className="calendar-cell__more">+{events.length - 3} more</span>
        )}
      </div>
    </div>
  );
});
