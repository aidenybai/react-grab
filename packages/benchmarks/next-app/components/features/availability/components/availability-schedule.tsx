"use client";

import { useState } from "react";

interface DaySchedule {
  day: string;
  enabled: boolean;
  ranges: Array<{ start: string; end: string }>;
}

interface AvailabilityScheduleProps {
  schedule: DaySchedule[];
  onChange?: (schedule: DaySchedule[]) => void;
  isReadOnly?: boolean;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function AvailabilitySchedule({
  schedule,
  onChange,
  isReadOnly = false,
}: AvailabilityScheduleProps) {
  const toggleDay = (dayIndex: number) => {
    if (isReadOnly) return;
    const updated = [...schedule];
    updated[dayIndex] = {
      ...updated[dayIndex],
      enabled: !updated[dayIndex].enabled,
    };
    onChange?.(updated);
  };

  return (
    <div className="availability-schedule">
      <h3 className="availability-schedule__title">Weekly Hours</h3>
      {DAYS.map((day, index) => {
        const daySchedule = schedule[index];
        return (
          <div key={day} className="availability-schedule__row">
            <label className="availability-schedule__day">
              <input
                type="checkbox"
                checked={daySchedule?.enabled ?? false}
                onChange={() => toggleDay(index)}
                disabled={isReadOnly}
              />
              {day}
            </label>
            {daySchedule?.enabled && (
              <div className="availability-schedule__ranges">
                {daySchedule.ranges.map((range, ri) => (
                  <span key={ri} className="availability-schedule__range">
                    {range.start} - {range.end}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
