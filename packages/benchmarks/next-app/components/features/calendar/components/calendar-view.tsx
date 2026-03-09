"use client";

import { useState, memo } from "react";

interface CalendarViewProps {
  initialDate?: Date;
  onDateSelect?: (date: Date) => void;
  view?: "month" | "week" | "day";
  className?: string;
}

export const CalendarView = memo(function CalendarView({
  initialDate = new Date(),
  onDateSelect,
  view = "month",
  className,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentView, setCurrentView] = useState(view);

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    onDateSelect?.(date);
  };

  return (
    <div
      className={`calendar-view calendar-view--${currentView} ${className ?? ""}`}
    >
      <div className="calendar-view__header">
        <button onClick={() => setCurrentView("month")}>Month</button>
        <button onClick={() => setCurrentView("week")}>Week</button>
        <button onClick={() => setCurrentView("day")}>Day</button>
      </div>
      <div className="calendar-view__body">
        <p>Viewing: {currentDate.toLocaleDateString()}</p>
      </div>
    </div>
  );
});
