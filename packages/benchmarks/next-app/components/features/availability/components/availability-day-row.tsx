"use client";

import { memo } from "react";

interface TimeRange {
  start: string;
  end: string;
}

interface AvailabilityDayRowProps {
  day: string;
  isEnabled: boolean;
  ranges: TimeRange[];
  onToggle?: () => void;
  onAddRange?: () => void;
  onRemoveRange?: (index: number) => void;
  onChangeRange?: (index: number, range: TimeRange) => void;
}

export const AvailabilityDayRow = memo(function AvailabilityDayRow({
  day,
  isEnabled,
  ranges,
  onToggle,
  onAddRange,
  onRemoveRange,
  onChangeRange,
}: AvailabilityDayRowProps) {
  return (
    <div
      className={`availability-day-row ${!isEnabled ? "availability-day-row--disabled" : ""}`}
    >
      <div className="availability-day-row__header">
        <label>
          <input type="checkbox" checked={isEnabled} onChange={onToggle} />
          <span className="availability-day-row__day-name">{day}</span>
        </label>
      </div>
      {isEnabled && (
        <div className="availability-day-row__ranges">
          {ranges.map((range, i) => (
            <div key={i} className="availability-day-row__range">
              <input
                type="time"
                value={range.start}
                onChange={(e) =>
                  onChangeRange?.(i, { ...range, start: e.target.value })
                }
              />
              <span>to</span>
              <input
                type="time"
                value={range.end}
                onChange={(e) =>
                  onChangeRange?.(i, { ...range, end: e.target.value })
                }
              />
              <button className="btn btn-sm" onClick={() => onRemoveRange?.(i)}>
                Remove
              </button>
            </div>
          ))}
          <button className="btn btn-sm btn-outline" onClick={onAddRange}>
            Add Time Range
          </button>
        </div>
      )}
    </div>
  );
});
