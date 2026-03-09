"use client";

import { memo } from "react";

interface CalendarHeaderProps {
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export const CalendarHeader = memo(function CalendarHeader({
  title,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
    <header className="calendar-header">
      <div className="calendar-header__nav">
        <button className="btn btn-outline" onClick={onPrevious}>
          Previous
        </button>
        <button className="btn btn-outline" onClick={onToday}>
          Today
        </button>
        <button className="btn btn-outline" onClick={onNext}>
          Next
        </button>
      </div>
      <h2 className="calendar-header__title">{title}</h2>
    </header>
  );
});
