"use client";
import React from "react";

interface TimeSlotButtonProps {
  time: string;
  available: boolean;
  selected: boolean;
  onSelect: (time: string) => void;
}

export const TimeSlotButton = ({
  time,
  available,
  selected,
  onSelect,
}: TimeSlotButtonProps) => (
  <button
    disabled={!available}
    onClick={() => available && onSelect(time)}
    style={{
      padding: "8px 16px",
      borderRadius: "6px",
      border: selected ? "2px solid #2563eb" : "1px solid #e5e7eb",
      background: selected ? "#eff6ff" : available ? "#fff" : "#f9fafb",
      color: available ? "#374151" : "#d1d5db",
      fontSize: "13px",
      fontWeight: selected ? 600 : 400,
      cursor: available ? "pointer" : "not-allowed",
      transition: "all 100ms ease",
    }}
  >
    {time}
  </button>
);
