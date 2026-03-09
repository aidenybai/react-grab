"use client";

import { useMemo } from "react";

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate?: Date;
  onCellClick?: (date: Date) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({
  year,
  month,
  selectedDate,
  onCellClick,
}: CalendarGridProps) {
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  return (
    <div className="calendar-grid" role="grid">
      <div className="calendar-grid__header" role="row">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="calendar-grid__day-label"
            role="columnheader"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-grid__body">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const date = new Date(year, month, day);
          const isSelected =
            selectedDate?.toDateString() === date.toDateString();
          return (
            <button
              key={day}
              className={`calendar-grid__cell ${isSelected ? "calendar-grid__cell--selected" : ""}`}
              onClick={() => onCellClick?.(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
