"use client";

import { useState, useMemo } from "react";

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  date: Date;
  slots: TimeSlot[];
  duration: number;
  selectedSlot?: string;
  onSlotSelect?: (start: string) => void;
}

export function TimeSlotPicker({
  date,
  slots,
  duration,
  selectedSlot,
  onSlotSelect,
}: TimeSlotPickerProps) {
  const availableSlots = useMemo(
    () => slots.filter((s) => s.available),
    [slots],
  );

  return (
    <div className="time-slot-picker">
      <h3 className="time-slot-picker__title">
        {date.toLocaleDateString("default", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h3>
      <p className="time-slot-picker__duration">{duration} min</p>
      <div className="time-slot-picker__grid">
        {availableSlots.length === 0 ? (
          <p className="time-slot-picker__empty">No available slots</p>
        ) : (
          availableSlots.map((slot) => (
            <button
              key={slot.start}
              className={`time-slot-picker__slot ${
                selectedSlot === slot.start
                  ? "time-slot-picker__slot--selected"
                  : ""
              }`}
              onClick={() => onSlotSelect?.(slot.start)}
            >
              {slot.start}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
