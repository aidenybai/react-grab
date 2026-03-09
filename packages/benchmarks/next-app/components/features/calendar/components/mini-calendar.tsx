"use client";

import { useState, memo } from "react";

interface MiniCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export const MiniCalendar = memo(function MiniCalendar({
  selectedDate,
  onDateSelect,
}: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__header">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}>
          ‹
        </button>
        <span>
          {viewDate.toLocaleString("default", { month: "long" })} {year}
        </span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>
      <div className="mini-calendar__grid">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, month, i + 1);
          const isSelected =
            selectedDate?.toDateString() === date.toDateString();
          return (
            <button
              key={i}
              className={`mini-calendar__day ${isSelected ? "mini-calendar__day--selected" : ""}`}
              onClick={() => onDateSelect?.(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
});
