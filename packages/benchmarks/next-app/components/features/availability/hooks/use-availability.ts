"use client";

import { useState, useCallback } from "react";

interface TimeRange {
  start: string;
  end: string;
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  ranges: TimeRange[];
}

export function useAvailability(scheduleId?: string) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = useCallback((dayIndex: number) => {
    setSchedule((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        enabled: !updated[dayIndex].enabled,
      };
      return updated;
    });
  }, []);

  const addRange = useCallback((dayIndex: number) => {
    setSchedule((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        ranges: [...updated[dayIndex].ranges, { start: "09:00", end: "17:00" }],
      };
      return updated;
    });
  }, []);

  const removeRange = useCallback((dayIndex: number, rangeIndex: number) => {
    setSchedule((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        ranges: updated[dayIndex].ranges.filter((_, i) => i !== rangeIndex),
      };
      return updated;
    });
  }, []);

  return {
    schedule,
    isLoading,
    isSaving,
    toggleDay,
    addRange,
    removeRange,
    setSchedule,
  };
}
