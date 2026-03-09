"use client";

import { useState, useCallback, useMemo } from "react";

type CalendarView = "month" | "week" | "day";

export function useCalendar(initialDate?: Date) {
  const [currentDate, setCurrentDate] = useState(initialDate ?? new Date());
  const [view, setView] = useState<CalendarView>("month");

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + 1);
      else if (view === "week") d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  }, [view]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() - 1);
      else if (view === "week") d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  }, [view]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const title = useMemo(() => {
    return currentDate.toLocaleDateString("default", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate]);

  return {
    currentDate,
    setCurrentDate,
    view,
    setView,
    goToNext,
    goToPrevious,
    goToToday,
    title,
  };
}
