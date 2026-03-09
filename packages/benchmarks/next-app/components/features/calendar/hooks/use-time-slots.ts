"use client";

import { useState, useCallback, useMemo } from "react";

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export function useTimeSlots(date: Date, duration: number = 30) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const slots = useMemo<TimeSlot[]>(() => {
    const result: TimeSlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let min = 0; min < 60; min += duration) {
        const start = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        const endMin = min + duration;
        const endHour = hour + Math.floor(endMin / 60);
        const end = `${endHour.toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;
        result.push({ start, end, available: Math.random() > 0.3 });
      }
    }
    return result;
  }, [date, duration]);

  const selectSlot = useCallback((start: string) => {
    setSelectedSlot(start);
  }, []);

  return { slots, selectedSlot, selectSlot, isLoading };
}
