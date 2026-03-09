"use client";

import { useState } from "react";

interface AvailabilityOverrideDialogProps {
  isOpen: boolean;
  date?: Date;
  onSave: (override: {
    date: string;
    ranges: Array<{ start: string; end: string }>;
  }) => void;
  onClose: () => void;
}

export function AvailabilityOverrideDialog({
  isOpen,
  date,
  onSave,
  onClose,
}: AvailabilityOverrideDialogProps) {
  const [ranges, setRanges] = useState([{ start: "09:00", end: "17:00" }]);
  const [isUnavailable, setIsUnavailable] = useState(false);

  if (!isOpen) return null;

  const dateStr = date?.toISOString().split("T")[0] ?? "";

  return (
    <div className="availability-override-dialog__overlay" onClick={onClose}>
      <div
        className="availability-override-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Date Override</h2>
        <p className="availability-override-dialog__date">{dateStr}</p>
        <label>
          <input
            type="checkbox"
            checked={isUnavailable}
            onChange={(e) => setIsUnavailable(e.target.checked)}
          />
          Mark as unavailable
        </label>
        {!isUnavailable && (
          <div className="availability-override-dialog__ranges">
            {ranges.map((range, i) => (
              <div key={i} className="availability-override-dialog__range">
                <input
                  type="time"
                  value={range.start}
                  onChange={(e) => {
                    const updated = [...ranges];
                    updated[i] = { ...updated[i], start: e.target.value };
                    setRanges(updated);
                  }}
                />
                <span>to</span>
                <input
                  type="time"
                  value={range.end}
                  onChange={(e) => {
                    const updated = [...ranges];
                    updated[i] = { ...updated[i], end: e.target.value };
                    setRanges(updated);
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="availability-override-dialog__actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSave({ date: dateStr, ranges: isUnavailable ? [] : ranges })
            }
          >
            Save Override
          </button>
        </div>
      </div>
    </div>
  );
}
